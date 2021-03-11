const backstop = require('backstopjs')
const customConfig = require('backstop.json')

if (process.env.CI === 'true') {
	customConfig.dockerCommandTemplate =
		'docker run --rm -i --mount type=bind,source="{cwd}",target=/src backstopjs/backstopjs:{version} {backstopCommand} {args}'
}

console.log('Running backstop with config', customConfig)

backstop('test', { config: customConfig, docker: true }).catch((err) => {
	console.error('Backstop test failed with ', err)
	if (process.env.CI === 'true') {
		process.exit(1)
	}
})
