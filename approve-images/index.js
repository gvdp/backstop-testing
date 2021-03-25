const io = require('@actions/io')
const exec = require('@actions/exec')
const quote = require('quote')
const github = require('@actions/github')
const core = require('@actions/core')

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


		const myToken = core.getInput('token')
		const octokit = github.getOctokit(myToken)
		const context = github.context
		console.log('context', context)

		const {data} = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts', {
			...context.repo,
		})

		console.log(data)


	} catch (error) {
		console.log(error)
		core.setFailed(error.message)
	}
}

async function commitResult() {
	console.log('committing')
	await exec.exec('ls')
}

console.log('sstart run')

downloadArtifact().then(() => {
	return approve().then(() => {
		return commitResult()
	})
})
