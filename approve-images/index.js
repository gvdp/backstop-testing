const io = require('@actions/io')
const exec = require('@actions/exec')
const quote = require('quote')
const github = require('@actions/github')
const core = require('@actions/core')

console.log('is core here?', core)

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
		console.log('downloading artifact hahahahaah')


		const myToken = core.getInput('token')
		console.log('token fetched to be', myToken) // todo: remove this log
		const octokit = github.getOctokit(myToken)
		console.log('kit authenticated')
		const context = github.context
		console.log('context', context.payload.issue.pull_request)
		console.log('context', context.payload.issue.pull_request.html_url)
		const prUrl = context.payload.issue.pull_request.html_url
		const prNumber = prUrl.substr(prUrl.indexOf('/pull/') + '/pull/'.length, prUrl.length)

		console.log('pr number: ', prNumber)

		const {prInfo} = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
			...context.repo,
			pull_number: prNumber,
		})

		console.log(prInfo)
		console.log('branch name', prInfo.head.ref)


		await exec.exec('git', ['checkout', prInfo.head.ref])


		const {data} = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts', {
			...context.repo,
		})

		console.log(data)


	} catch (error) {
		console.log('something went wrong')
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
