import { assert } from '../../../deps/deno/assert.ts'
import { fs } from "../../../deps/deno/fs.ts";
import { path } from '../../../deps/deno/path.ts'

import { ts } from '../../../deps/any/typescript.ts'
import type { TS } from '../../../deps/any/typescript.ts'

import type { ImportExportGraphNode, ImportMetaAst, ExportDeclarationAst, ModuleSpecifier } from "./types.ts"


export async function parseImportExportStatements (source: TS.SourceFile, filepath: string): Promise<ImportExportGraphNode>
{
	const dirname = path.dirname(filepath)
	
	const iegn: ImportExportGraphNode =
	{
		imports : [],
		exports : [],
		reexports : []
	}
	
	// Run through all top-level statements (all import/exports statements are top-level)
	for (const statement of source.statements)
	{
		// For imports
		if (statement.kind == ts.SyntaxKind.ImportDeclaration)
		{
			const importDeclaration = statement as TS.ImportDeclaration
			
			const moduleSpecifier = await parseModuleSpecifier(importDeclaration.moduleSpecifier as ts.StringLiteral, dirname)
			
			const loc =
			{
				start : importDeclaration.pos,
				end : importDeclaration.end
			}
			
			const importAstNode: ImportMetaAst =
			{
				type : 'ImportMetaAst',
				moduleSpecifier,
				loc,
				isType : false
			}
			
			if (importDeclaration.importClause)
			{
				const { name, namedBindings, isTypeOnly } = importDeclaration.importClause
		
				importAstNode.isType = isTypeOnly
				
				if (name)
				{
					importAstNode.default = name.text
				}
			
				if (namedBindings)
				{
					if (ts.isNamespaceImport(namedBindings))
					{
						importAstNode.namespace = namedBindings.name.text
					}
					else if (ts.isNamedImports(namedBindings))
					{
						importAstNode.named = namedBindings.elements.map( (element) =>
						{
							return {
								name : element.propertyName?.text || element.name.text,
								alias : element.propertyName ? element.name.text : undefined,
								isType : element.isTypeOnly
							}
						})
					}
				}
			}
		
			iegn.imports.push(importAstNode)
			
		}
		// For re-exports aka Aggregation exports
		else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier)
		{
			const moduleSpecifier = await parseModuleSpecifier(statement.moduleSpecifier as ts.StringLiteral, dirname)
			
			const loc =
			{
				start : statement.pos,
				end : statement.end,
			}

			if (statement.exportClause)
			{
				// We're considering that the export either has named exports 
				// or is a namespace export. It can be both actually:
				//   export * as ns, { name1 as alias1 } from "module-name"
				// but the way TS parses it is insane:
				// It says:
				//   { name1 as alias1 }
				// Is the moduleSpecifier of the ExportDeclaration
				
				if (ts.isNamedExports(statement.exportClause))
				{
					iegn.reexports.push(
					{
						type : 'ReexportMetaAst',
						named : statement.exportClause.elements.map( (element) =>
						{
							// If propertyName is defined, it is the initial name of the import
							// and name is the local alias
							if (element.propertyName)
							{
								return {
									name : element.propertyName.text,
									alias : element.name.text,
								}
							}
							// If not, then *name* is the initial name of the import
							// (and there's no alias)
							else
							{
								return {
									name : element.name.text,
									alias : undefined,
								}
							}
							
						}),
						
						moduleSpecifier,
						loc
					})
				}
				else
				{
					iegn.reexports.push(
					{
						type : 'ReexportMetaAst',
						namespace  : ts.isNamespaceExport(statement.exportClause),
						namespaceAlias : statement.exportClause.name?.text,
						moduleSpecifier,
						loc
					})
				}
			}
			else
			{
				iegn.reexports.push(
				{
					type : 'ReexportMetaAst',
					namespace : true,
					moduleSpecifier,
					loc
				})
			}
		}
		// For export lists
		else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier == undefined)
		{
			const loc =
			{
				start: statement.pos,
				end: statement.end,
			}
			
			assert(statement.exportClause)
			assert(statement.exportClause.kind == ts.SyntaxKind.NamedExports)
			
			iegn.exports.push(
			{
				type : 'ExportListAst',
				named : statement.exportClause.elements.map( (element) =>
				{
					// If propertyName is defined, it is the initial name of the import
					// and name is the local alias
					if (element.propertyName)
					{
						return {
							name : element.propertyName.text,
							alias : element.name.text,
						}
					}
					// If not, then *name* is the initial name of the import
					// (and there's no alias)
					else
					{
						return {
							name : element.name.text,
							alias : undefined,
						}
					}
					
				}),
				
				loc
			})
		}
		// For export declarations
		else if ('modifiers' in statement && Array.isArray(statement.modifiers) && statement.modifiers.some( (modifier) => modifier.kind == ts.SyntaxKind.ExportKeyword))
		{
			let exportAst: ExportDeclarationAst | undefined = undefined

			const isDefault = statement.modifiers.some( (modifier) => modifier.kind == ts.SyntaxKind.DefaultKeyword)
			
			const loc =
			{
				start: statement.pos,
				end: statement.end,
			}
			
			// If it's a variable
			if (statement.kind == ts.SyntaxKind.VariableStatement)
			{
				const variableSt = statement as TS.VariableStatement
				const variableDeclList = variableSt.declarationList
				
				const flavor = (variableDeclList.flags & ts.NodeFlags.Const)
									? 'const' as const
									: (variableDeclList.flags & ts.NodeFlags.Let)
									? 'let' as const
									: 'var' as const
				
				const declarations = variableDeclList.declarations.map( (decl) =>
				{
					assert(ts.isIdentifier(decl.name)) // fixme: if it's not, we have an object or array pattern
					
					return {
						name : decl.name.escapedText.toString()
					}
				})
				
				exportAst =
				{
					type : 'ExportDeclarationAst',
					kind : 'variable',
					flavor,
					declarations,
					isDefault,
					loc
				}
			}
			// If it's a function
			else if (statement.kind == ts.SyntaxKind.FunctionDeclaration && (statement as TS.FunctionDeclaration).asteriskToken == undefined)
			{
				const funcDecl = statement as ts.FunctionDeclaration
				const funcName = funcDecl.name ? funcDecl.name.escapedText.toString() : ""
				
				// A function can only be anonymous if it's a default export
				if (isDefault == false)
				{
					assert(funcName.length > 0)
				}

				exportAst =
				{
					type : 'ExportDeclarationAst',
					kind : 'function',
					flavor : 'function',
					name : funcName,
					isDefault,
					loc
				}
			}
			// If it's a function generator
			else if (statement.kind == ts.SyntaxKind.FunctionDeclaration && (statement as TS.FunctionDeclaration).asteriskToken?.kind == ts.SyntaxKind.AsteriskToken)
			{
				const funcDecl = statement as ts.FunctionDeclaration
				const funcName = funcDecl.name ? funcDecl.name.escapedText.toString() : ""
				
				// A function can only be anonymous if it's a default export
				if (isDefault == false)
				{
					assert(funcName.length > 0)
				}
				
				exportAst =
				{
					type : 'ExportDeclarationAst',
					kind : 'function',
					flavor : 'generator',
					name : funcName,
					isDefault,
					loc
				}
			}
			// If it's a class
			else if (statement.kind == ts.SyntaxKind.ClassDeclaration)
			{
				const classDecl = statement as ts.ClassDeclaration
				const className = classDecl.name ? classDecl.name.escapedText.toString() : ""
				
				// A class can only be anonymous if it's a default export
				if (isDefault == false)
				{
					assert(className.length > 0)
				}

				exportAst =
				{
					type : 'ExportDeclarationAst',
					kind : 'class',
					name : className,
					isDefault,
					loc
				}
			}
			// If it's an interface
			else if (statement.kind == ts.SyntaxKind.InterfaceDeclaration)
			{
				const decl = statement as ts.InterfaceDeclaration
				const name = decl.name.escapedText.toString()

				exportAst =
				{
					type : 'InterfaceDeclarationAst',
					name,
					isDefault,  // fixme: does it make sense ?
					loc
				}
			}
			// If it's a type
			else if (statement.kind == ts.SyntaxKind.TypeAliasDeclaration)
			{
				const decl = statement as ts.TypeAliasDeclaration
				const name = decl.name.escapedText.toString()
				
				exportAst =
				{
					type : 'TypeDeclarationAst',
					name,
					isDefault,
					loc
				}
			}
			// If it's an enum
			else if (statement.kind == ts.SyntaxKind.EnumDeclaration)
			{
				const decl = statement as ts.EnumDeclaration
				const name = decl.name.escapedText.toString()

				exportAst =
				{
					type : 'EnumDeclarationAst',
					name,
					isDefault,
					loc
				}
			}
			// If it's a namespace/module
			else if (statement.kind == ts.SyntaxKind.ModuleDeclaration)
			{
				const decl = statement as ts.ModuleDeclaration
				const name = typeof decl.name == "string"
								? decl.name
								: (decl.name as TS.Identifier).escapedText.toString()

				exportAst =
				{
					type : 'ModuleDeclarationAst',
					name,
					isDefault,
					loc
				}
			}
			
			assert(exportAst)
			iegn.exports.push(exportAst)
		}
	}
	
	return iegn
}

export async function parseImportExportStatementsFromString (source: string, filepath: string): Promise<ImportExportGraphNode>
{
	const sourceAst = ts.createSourceFile(
		filepath,
		source,
		ts.ScriptTarget.Latest,
		true
	)
	
	return await parseImportExportStatements(sourceAst, filepath)
}


// HELPERS

const VALID_EXTENSIONS = [ '.js', '.ts', '.jsx', '.tsx' ]

async function resolveModuleSpecifier (dirname: string, moduleSpecifier: string): Promise<string>
{
	// Check if the specifier directly points do a file
	try
	{
		const absolute = path.resolve(dirname, moduleSpecifier)
		const stat = await fs.stat(absolute)
		if (stat.isFile)
		{
			return absolute
		}
	}
	catch (_error)
	{
		// Silence the error
	}
	
	// Check if the specifier is an extensionless path to a file
	for (const ext of VALID_EXTENSIONS)
	{
		const filepath = path.resolve(dirname, `${moduleSpecifier}${ext}`)
		try
		{
			await fs.stat(filepath)
			return filepath
		}
		catch (_error)
		{
			// Silence the error
		}
	}
	
	// Check if the specifier is a directory with an index file
	for (const ext of VALID_EXTENSIONS)
	{
		const filepath = path.resolve(dirname, moduleSpecifier, `index${ext}`)
		try
		{
			await fs.stat(filepath)
			return filepath
		}
		catch (_error)
		{
			// Silence the error
		}
	}
	
	throw new Error(`Failed to resolve module specifier to a file with a supported extension:\n${moduleSpecifier}`)
}

async function parseModuleSpecifier (specifier: TS.StringLiteral, directory: string): Promise<ModuleSpecifier>
{
	const moduleSpecifierText = specifier.text

	const prefixRegex = /^(copy:|webworker:)/
	const prefixMatch = moduleSpecifierText.match(prefixRegex)
	const prefix = prefixMatch ? prefixMatch[0] : undefined
	const rawSpecifier = prefix ? moduleSpecifierText.replace(prefixRegex, '') : moduleSpecifierText
	const isPackageId = !rawSpecifier.startsWith('./') && !rawSpecifier.startsWith('../')
	const resolvedSpecifier = isPackageId ? rawSpecifier : await resolveModuleSpecifier(directory, rawSpecifier)

	return {
		specifier : resolvedSpecifier,
		isPackageId,
		prefix,
	}
}
