console.log('Starting backstop action')

// const backstop = require('backstopjs')
const exec = require('@actions/exec')
const core = require('@actions/core')
const io = require('@actions/io')
const quote = require('quote')

console.log('Backstop loaded')

const fs = require('fs')
const path = require('path')

console.log('path and file loaded')

const configFile = fs.readFileSync(path.join(__dirname, 'backstop.json'))
const customConfig = JSON.parse(configFile)

console.log('config parsed')

if (process.env.CI === 'true') {
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


fs.writeFileSync(path.join(__dirname, 'backstop.json'), customConfig.toString())


async function runTest() {

	return io.which('yarn', true)
		.then(yarnPath => {
			console.log('yarn at "%s"', yarnPath)

			const args = 'test'
			core.debug(
				`yarn command: "${yarnPath}" ${args} `,
			)
			return exec.exec('pwd', [], {cwd: './action'})
				.then(() => {
					return exec.exec(quote(yarnPath), ['test'], {cwd: './action'})

				})
				.catch((err) => {
					console.error('Backstop test failing with ', err)
					if (process.env.CI === 'true') {
						//todo: make this mark the build as failed
						// process.exit(1)
						core.setFailed(err.message)

					}
					console.log('after failure')
					return upload()
				})
				.then(() => {
					console.log('backstop test done')
				})
		})
}


async function upload() {
	try {
		console.log('uploading artifact')
		await exec.exec('pwd')
		await exec.exec('ls')
		await exec.exec('node action/upload-artifact/index.js')
	} catch (error) {
		console.log(error)
		core.setFailed(error.message)
	}
}

runTest()
