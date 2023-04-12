
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

export interface ImportMetaAst extends MetaAst
{
	type: 'ImportMetaAst'
	
	default?: string
	namespace?: string
	named?:
	{
		name: string
		alias?: string
	}[]
	
	moduleSpecifier: ModuleSpecifier
}

export interface ExportDeclarationAst extends MetaAst
{
	type: 'ExportDeclarationAst'
	kind: 'variable' | 'function' | 'function*' | 'class',
	isDefault: boolean
	declarations:
	{
		name?: string
		alias?: string
		kind?: 'const' | 'let' | 'var',
		
		//initializer?: any
		//isObjectPattern? boolean (in which case, there's no "name")
		//isArrayPattern? boolean (in which case, there's no "name")
	}[]
}

export interface ExportListAst extends MetaAst
{
	type: 'ExportListAst'
	named:
	{
		name?: string
		alias?: string
	}[]
}

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

export interface ImportExportGraphNode
{
	imports: ImportMetaAst[]
	exports: (ExportDeclarationAst|ExportListAst)[]
	reexports: ReexportMetaAst[]
}
