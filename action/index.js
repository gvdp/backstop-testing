console.log("Starting backstop action")

const backstop = require('backstopjs')
const exec = require('@actions/exec')

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

console.log('Running backstop with config', customConfig)

// backstop('test', { config: customConfig, docker: true }).catch((err) => {
// 	console.error('Backstop test failed with ', err)
// 	if (process.env.CI === 'true') {
// 		//todo: make this mark the build as failed
// 		// process.exit(1)
// 	}
// })
//

exec.exec('node upload-artifact/index.js')
