const io = require('@actions/io')
const exec = require('@actions/exec')
const quote = require('quote')
const github = require('@actions/github')
const core = require('@actions/core')
const got = require('got')
const fs = require('fs')
const stream = require('stream')
const util = require('util')
const asyncStream = util.promisify(stream.pipeline)

console.log('is core here?', core)

async function approve() {
	const yarnPath = await io.which('yarn', true)
	console.log('yarn at "%s"', yarnPath)

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
	await exec.exec(`${bin.trim()}/backstop`, ['approve'])

	console.log('where are we?')
	await exec.exec('pwd')
	await exec.exec('ls', '/home/runner/work/backstop-testing/backstop-testing')
	await exec.exec('ls', '/home/runner/work/backstop-testing/backstop-testing/approve-images')


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
			pull_number: Number(prNumber),
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

		console.log('downloading wanted artifact')

		const artifactendpoint = octokit.actions.downloadArtifact.endpoint({
			...context.repo,
			artifact_id: wantedArtifact.id,
			archive_format: 'zip',
		})
		console.log('endpoint: ', artifactendpoint)
		const resp = await got({
			url: artifactendpoint.url,
			headers: {...artifactendpoint.headers, Authorization: `token ${myToken}`},
			followRedirect: false,
		})

		const artifactUrl = resp.headers.location

		console.log('Found url', artifactUrl)
		const fileName = 'approve-images/backstop_report.zip'
		const downloadStream = got.stream(artifactUrl)
		const fileWriterStream = fs.createWriteStream(fileName)
		console.log(`Downloading ${artifactUrl}`)
		downloadStream.on('downloadProgress', ({transferred, total, percent}) => {
			const percentage = Math.round(percent * 100)
			// console.log(`Progress: ${transferred}/${total} (${percentage}%)`)
		})

		await asyncStream(downloadStream, fileWriterStream)

		console.log('Done?')
		// await exec.exec('wget', [artifactUrl, '-O', './approve-images'])
		await exec.exec('ls', ['approve-images', '-al'])
		await exec.exec('unzip', [fileName, '-d', 'approve-images/backstop_data'])


		await exec.exec('ls', ['approve-images/backstop_data', '-al'])


	} catch (error) {
		console.log('something went wrong')
		console.log(error)
		core.setFailed(error.message)
	}
}

async function commitResult() {
	console.log('committing')
	await exec.exec('git', ['status'])
	await exec.exec('git', ['add', 'approve-images/backstop_data'])
	await exec.exec('git', ['status'])
	await exec.exec('git', ['config', '--global', 'user.email', 'ikke@hotmail.com'])
	await exec.exec('git', ['config', '--global', 'user.name', 'github'])
	await exec.exec('git', ['commit', '-m', 'what up'])
	await exec.exec('git', ['push'])
}

console.log('sstart run')

downloadArtifact().then(() => {
	return approve().then(() => {
		return commitResult()
	})
})
