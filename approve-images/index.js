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
		// console.log('context', context)
		console.log('context', context.payload.issue.pull_request)
		const prUrl = context.payload.issue.pull_request.html_url
		const prNumber = prUrl.substr(prUrl.indexOf('/pull/') + '/pull/'.length, prUrl.length)




		console.log('pr number: ', prNumber)


		const prOpts = {
			...context.repo,
			pull_number: Number(prNumber ),
		}
		console.log('getting pr', prOpts)

		const {data: prInfo} = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', prOpts)

		// console.log(prInfo)
		console.log('branch name', prInfo.head.ref)


		await exec.exec('git', ['status'])
		await exec.exec('git', ['fetch'])
		await exec.exec('git', ['checkout', prInfo.head.ref])


		console.log('listing artifacts for ', context.repo)

		const {data: artifact} = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts', {
			...context.repo,
		})


		//todo: search for the correct one with pr title
		const wantedArtifact = artifact.artifacts[0]

		console.log('downloading wanter artifact')
		const artifactUrl = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}', {
			...context.repo,
			artifact_id: wantedArtifact.id,
			archive_format: 'zip'
		})

		console.log('Found url', artifactUrl);

		await exec.exec('wget', [artifactUrl, '-O', './approve-images'])
		await exec.exec('ls', ['-al'])


		await exec.exec('unzip', [artifactUrl, '-O', './approve-images'])




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
