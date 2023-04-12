import { assert } from "../deps/std/assert.ts";
import * as path from "../deps/std/path.ts"

import { Walker } from "../deps/magiked.ts"
import { ts } from "../deps/typescript.ts"

import type { TsPayload } from "./MagikedTypescript.ts"
import { magikedTypescript } from "./MagikedTypescript.ts"

const DATA_BASE_PATH = "tests/walk/"


Deno.test("Walk, ts file", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH)

	const walker = new Walker<TsPayload>()
	await walker.init(dir,
	{
		async onFileNodeEnter (node, _, filepath)
		{
			// filepath is provided only on first pass
			assert(filepath)
			
			const content = await Deno.readTextFile(filepath)

			if (Walker.matches.glob(filepath, "**/*.ts"))
			{
				node.payload = magikedTypescript(content, { filepath })
			}
		}
	})
	
	const node = walker.pathAsStringToNode('one.ts')
	assert(node && node.kind == 'FILE')
	
	const payload = node.payload
	assert(payload)
	
	const statement = payload.ast.statements[0]
	assert(statement)

	assert(statement.kind == ts.SyntaxKind.FunctionDeclaration)
	
	const extension = payload.ext
	assert(extension && extension == '.ts')
});

Deno.test("Walk, js file", async () =>
{
	const dir = path.resolve(DATA_BASE_PATH)

	const walker = new Walker<TsPayload>()
	await walker.init(dir,
	{
		async onFileNodeEnter (node, _, filepath)
		{
			// filepath is provided only on first pass
			assert(filepath)
			
			const content = await Deno.readTextFile(filepath)

			if (Walker.matches.glob(filepath, "**/*.js"))
			{
				node.payload = magikedTypescript(content, { filepath })
			}
		}
	})
	
	const node = walker.pathAsStringToNode('two.js')
	assert(node && node.kind == 'FILE')
	
	const payload = node.payload
	assert(payload)
	
	const statement = payload.ast.statements[0]
	assert(statement)

	assert(statement.kind == ts.SyntaxKind.FunctionDeclaration)
	
	const extension = payload.ext
	assert(extension && extension == '.js')
});
