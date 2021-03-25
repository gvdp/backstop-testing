const io = require('@actions/io')
const exec = require('@actions/exec')
const quote = require('quote')


async function approve() {
	return io.which('yarn', true)
		.then(yarnPath => {
			console.log('yarn at "%s"', yarnPath)

			const args = 'approve'
			core.debug(
				`yarn command: "${yarnPath}" ${args} `,
			)

			return exec.exec(quote(yarnPath), ['approve'], {cwd: './approve-images'})

		})
}


async function downloadArtifact() {
	try {
		console.log('downloading artifact')
		await exec.exec('node action/download-artifact/index.js')
		await exec.exec('ls')
	} catch (error) {
		console.log(error)
		core.setFailed(error.message)
	}
}


downloadArtifact().then(() => {
	approve()
})
