console.log('Starting backstop action')

// const backstop = require('backstopjs')
const exec = require('@actions/exec')
const core = require('@actions/core')
const io = require('@actions/io')
const artifact = require('@actions/artifact')
const quote = require('quote')

console.log('Backstop loaded')

const fs = require('fs')
const path = require('path')

console.log('path and file loaded')

const configFile = fs.readFileSync(path.join(process.cwd(), 'backstop.json'))
const customConfig = JSON.parse(configFile)

console.log('config parsed')

if (process.env.CI === 'true') {
	// removes -t parameter for run because ci agent is not a tty terminal
	customConfig.dockerCommandTemplate =
		'docker run --rm -i --mount type=bind,source="{cwd}",target=/src backstopjs/backstopjs:{version} {backstopCommand} {args}'
}

// todo: hardcode properties to
// "paths": {
// 	"bitmaps_reference": "bitmaps_reference",
// 		"bitmaps_test": "backstop_data/bitmaps_test",
// 		"engine_scripts": "engine_scripts",
// 		"html_report": "html_report",
// 		"ci_report": "ci_report"
// }, ????


console.log('Running backstop with config', customConfig)


fs.writeFileSync(path.join(process.cwd(), 'backstop.json'), JSON.stringify(customConfig))


async function upload() {

	const artifactClient = artifact.create()
	//todo: set name to include branch name
	const artifactName = 'backstop-report'
	const files = [
		'backstop_data/bitmaps_reference',
		'backstop_data/html_report',
		'backstop_data/bitmaps_test',
	]
	const rootDirectory = '.'
	const options = {
		continueOnError: false,
	}

	try {
		console.log('uploading artifact')
		await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options)
		console.log('uploaded artifact')

	} catch (error) {
		console.error('Upload failed')
		console.log(error)
		core.setFailed(error.message)
	}
}


async function runTest() {

	const yarnPath = await io.which('yarn', true)
	console.log('yarn at "%s"', yarnPath)

	const args = 'test'
	core.debug(
		`yarn command: "${yarnPath}" ${args} `,
	)
	try {

		// todo: pin version?
		console.log('adding backstop')
		await exec.exec(quote(yarnPath), ['global', 'add', 'backstopjs@5.1.0'])
		let bin = ''
		const options = {
			listeners: {
				stdout: (data) => {
					bin += data.toString()
				},
			},
		}
		await exec.exec(quote(yarnPath), ['global', 'bin'], options)

		console.log('yarn bin at', bin)
		// todo: make config location configurable
		await exec.exec(`${bin.trim()}/backstop`, ['test', '--docker'])

	} catch (err) {
		console.error('Backstop test failing with ', err)
		if (process.env.CI === 'true') {
			//todo: make this mark the build as failed
			// process.exit(1)
			core.setFailed(err.message)

		}
		console.log('after failure')
		return upload()
	}
	console.log('backstop test done')
}

runTest()
