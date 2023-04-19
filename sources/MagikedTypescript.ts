import { path } from "../deps/deno/path.ts"

import type { Payload } from "../deps/any/magiked.ts"

import { ts } from "../deps/any/typescript.ts"
import type { TS } from "../deps/any/typescript.ts"


export interface TsPayload extends Payload
{
	type: 'typescript'
	ast: TS.SourceFile
	ext?: string
}


export interface MagikedTypescriptOptions
{
	target: TS.ScriptTarget
	parents: boolean
	filepath?: string
}

const DEFAULT_OPTIONS = { target : ts.ScriptTarget.ES2022, parents : true }


export function magikedTypescript (code: string, options: Partial<MagikedTypescriptOptions> = {}): TsPayload
{
	const opts = { ...DEFAULT_OPTIONS, ...options }
	const filepath = opts.filepath ?? 'code_fragment'
	
	let source: TS.SourceFile | undefined
	
	try
	{
		source = ts.createSourceFile(
			filepath,
			code,
			opts.target,
			opts.parents
		)
	}
	catch (error)
	{
		throw new Error(`Failed to parse file: ${filepath}\n\nCaused by:${error}`)
		
		// This won't work despite compilerOptions's target and lib set to ES2022
		//throw new Error(`Failed to parse file: ${filepath}`, { cause : error })
	}
	
	if (opts.filepath)
	{
		const ext = path.extname(filepath)
		
		return {
			type : 'typescript',
			ast : source,
			ext
		}
	}
	
	return {
		type : 'typescript',
		ast : source
	}
}
