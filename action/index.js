console.log('Starting backstop action')

// const backstop = require('backstopjs')
const exec = require('@actions/exec')
const core = require('@actions/core')

console.log('Backstop loaded')

const fs = require('fs')
const path = require('path')

console.log('path and file loaded')

const configFile = fs.readFileSync(path.join(__dirname, 'backstop.json'))
const customConfig = JSON.parse(configFile)

console.log('config parsed')

// if (process.env.CI === 'true') {
// 	customConfig.dockerCommandTemplate =
// 		'docker run --rm -i --mount type=bind,source="{cwd}",target=/src backstopjs/backstopjs:{version} {backstopCommand} {args}'
// }

// todo: hardcode properties to
// "paths": {
// 	"bitmaps_reference": "bitmaps_reference",
// 		"bitmaps_test": "backstop_data/bitmaps_test",
// 		"engine_scripts": "engine_scripts",
// 		"html_report": "html_report",
// 		"ci_report": "ci_report"
// }, ????


console.log('Running backstop with config', configFile)

async function runTest() {
	return exec.exec('yarn test', [], {}).catch((err) => {
		console.error('Backstop test failing with ', err)
		if (process.env.CI === 'true') {
			//todo: make this mark the build as failed
			// process.exit(1)
		}
		console.log('after failure')
	}).then(() => {
		console.log('backstop test done')
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

runTest().then(() => {
	upload()
})
