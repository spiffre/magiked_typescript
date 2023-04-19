import { assert } from "https://deno.land/std@0.182.0/testing/asserts.ts";
import { copy } from "https://deno.land/std@0.182.0/fs/mod.ts";
import { build } from "https://deno.land/x/dnt@0.34.0/mod.ts"

const TEMP_DIR = "npm/temp"
const NPM_DIR = "npm"


async function switchToNodeDependencies ()
{
	const process = Deno.run(
	{
		cmd : [ "find", "./sources/", "-type", "f", "-name","*.ts", "-exec", "sed", "-i", "", "s/deps\\/deno/deps\\/node/g", "{}", "+" ],
		stdout : "piped",
		stderr : "piped",
	})
	
	const status = await process.status()
	assert(status.success == true, "switchToNodeDependencies() process failed")
	
	const stdout = await process.output()
	assert(new TextDecoder("utf8").decode(stdout) == "", "switchToNodeDependencies() stdout non-empty")
	
	const stderr = await process.stderrOutput()
	assert(new TextDecoder("utf8").decode(stderr) == "", "switchToNodeDependencies() stderr non-empty")
	
	process.close()
}

async function switchToDenoDependencies ()
{
	const process = Deno.run(
	{
		cmd : [ "find", "./sources/", "-type", "f", "-name","*.ts", "-exec", "sed", "-i", "", "s/deps\\/node/deps\\/deno/g", "{}", "+" ],
		stdout : "piped",
		stderr : "piped",
	})
	
	const status = await process.status()
	assert(status.success == true, "revertToDenoDependencies() process failed")
	
	const stdout = await process.output()
	assert(new TextDecoder("utf8").decode(stdout) == "", "revertToDenoDependencies() stdout non-empty")
	
	const stderr = await process.stderrOutput()
	assert(new TextDecoder("utf8").decode(stderr) == "", "revertToDenoDependencies() stderr non-empty")
	
	process.close()
}

// Switch to node dependencies during the packaging
await switchToNodeDependencies()


// Copy test data
await Deno.remove("npm", { recursive: true }).catch( (_) => {} )
await copy("tests", `${TEMP_DIR}/esm/tests`, { overwrite : true })
await copy("tests", `${TEMP_DIR}/script/tests`, { overwrite : true })

const version: string|undefined = Deno.args[0]
if (version == undefined)
{
	console.error("A version tag could not be found")
	console.error("Aborted\n")
	Deno.exit(1)
}
const versionShort = version?.replace(/^v/, "")

await build(
{
	entryPoints: [ "./mod.ts" ],
	outDir: TEMP_DIR,
	
	shims:
	{
		deno : 'dev'
	},
	
	mappings:
	{
		"https://deno.land/x/magiked@0.7.0/mod.ts":
		{
			name: "@spiffre/magiked",
			version: "^0.7.0",
			peerDependency: false,
		},
	},
	
	package:
	{
		name: "@spiffre/magiked_typescript",
		version: versionShort,
		description: "",
		license: "MIT",
		
		repository:
		{
			type: "git",
			url: "git+https://github.com/spiffre/magiked_typescript",
		},
		
		files:
		[
			"package.json",
			"types/mod.d.ts",
			"types/sources/",
			"esm/mod.js",
			"esm/sources/",
			"esm/deps/",
			"script/mod.js",
			"script/sources/",
			"script/deps/",
		]
	},
	
	postBuild ()
	{
		// Copy README file
		Deno.copyFileSync("README.md", `${TEMP_DIR}/README.md`);
	}
})

// Pack the temp directory to a .tgz archive
const process = Deno.run(
{
	cmd : [ "npm", "pack", `./${TEMP_DIR}`, "--pack-destination", `./${NPM_DIR}` ],
	stdout : "piped"
})
const output = new TextDecoder("utf8").decode(await process.output())
process.close()

//const archiveName = output
//const archivePath = `./${NPM_DIR}/${archiveName}`

// Extract the archive
const process2 = Deno.run(
{
	cmd : [ "tar", "-xvf", `spiffre-magiked_typescript-${versionShort}.tgz` ],
	cwd : NPM_DIR,
	stdout : "piped"
})
new TextDecoder("utf8").decode(await process2.output())
process2.close()


// Revert the code to what it was, using deno dependencies
await switchToDenoDependencies()
