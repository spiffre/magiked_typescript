
export interface ModuleSpecifier
{
	prefix?: string
	specifier: string
	isPackageId?: boolean
}

export interface MetaAst
{
	loc:
	{
		start: number
		end: number
	}
}

// IMPORT

export interface ImportMetaAst extends MetaAst
{
	type: 'ImportMetaAst'
	
	default?: string
	namespace?: string
	named?:
	{
		name: string
		isType: boolean
		alias?: string
	}[]
	
	isType: boolean
	moduleSpecifier: ModuleSpecifier
}

// EXPORT DECLARATION / DEFAULT EXPORT DECLARATION

interface VariableDeclarationAst extends MetaAst
{
	type: 'ExportDeclarationAst'
	kind: 'variable'
	flavor: 'const' | 'let' | 'var'
	isDefault: boolean
	
	declarations: { name: string }[]
}

interface FunctionDeclarationAst extends MetaAst
{
	type: 'ExportDeclarationAst'
	kind: 'function'
	flavor: 'function' | 'generator'
	isDefault: boolean
	
	name?: string
}

interface ClassDeclarationAst extends MetaAst
{
	type: 'ExportDeclarationAst'
	kind: 'class'
	isDefault: boolean
	
	name?: string
}




interface InterfaceDeclarationAst extends MetaAst
{
	type: 'InterfaceDeclarationAst'
	isDefault: boolean
	
	name: string
}

interface TypeDeclarationAst extends MetaAst
{
	type: 'TypeDeclarationAst'
	isDefault: boolean
	
	name: string
}

interface EnumDeclarationAst extends MetaAst
{
	type: 'EnumDeclarationAst'
	isDefault: boolean
	
	name: string
}



export type ExportDeclarationAst =
  | VariableDeclarationAst
  | FunctionDeclarationAst
  | ClassDeclarationAst
  | InterfaceDeclarationAst
  | TypeDeclarationAst
  | EnumDeclarationAst

// EXPORT LIST

export interface ExportListAst extends MetaAst
{
	type: 'ExportListAst'
	named:
	{
		name?: string
		alias?: string
	}[]
}

// RE-EXPORT

export interface ReexportMetaAst extends MetaAst
{
	type: 'ReexportMetaAst'
	named?:
	{
		name: string
		alias?: string
	}[]
	
	namespace?: boolean
	namespaceAlias?: string
	moduleSpecifier: ModuleSpecifier
}

// MISC

export interface ImportExportGraphNode
{
	imports: ImportMetaAst[]
	exports: (ExportDeclarationAst|ExportListAst)[]
	reexports: ReexportMetaAst[]
}
