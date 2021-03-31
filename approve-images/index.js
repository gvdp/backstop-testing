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


async function getYarnExecutablFolder(yarnPath) {
	let yarnExecutableFolder = ''
	const options = {
		listeners: {
			stdout: (data) => {
				yarnExecutableFolder += data.toString()
			},
		},
	}
	await exec.exec(quote(yarnPath), ['global', 'bin'], options)
	return yarnExecutableFolder
}

async function approve() {
	const yarnPath = await io.which('yarn', true)
	// todo: pin version?
	console.log('adding backstop')
	const backstopVersion = core.getInput('backstop-version')
	await exec.exec(quote(yarnPath), ['global', 'add', `backstopjs@${backstopVersion}`])
	const yarnExecutableFolder = await getYarnExecutablFolder(yarnPath)

	// todo: make config location configurable
	await exec.exec(`${yarnExecutableFolder.trim()}/backstop`, ['approve'])
}


async function downloadArtifact() {
	try {
		console.log('downloading artifact')


		const myToken = core.getInput('token')
		const octokit = github.getOctokit(myToken)
		const context = github.context

		const prUrl = context.payload.issue.pull_request.html_url
		const prNumber = prUrl.substr(prUrl.indexOf('/pull/') + '/pull/'.length, prUrl.length)
		console.log('Fetching PR Info')

		const {data: pullRequest} = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
			...context.repo,
			pull_number: Number(prNumber),
		})

		console.log('branch name', pullRequest.head.ref)

		await exec.exec('git', ['fetch'])
		await exec.exec('git', ['checkout', pullRequest.head.ref])

		console.log('listing artifacts')

		const {data: artifacts} = await octokit.request('GET /repos/{owner}/{repo}/actions/artifacts', {
			...context.repo,
		})

		//todo: search for the correct one with pr title
		const wantedArtifact = artifacts.artifacts[0]

		console.log('downloading wanted artifact')

		const downloadArtifactEndpoint = octokit.actions.downloadArtifact.endpoint({
			...context.repo,
			artifact_id: wantedArtifact.id,
			archive_format: 'zip',
		})

		const downloadArtifactResponse = await got({
			url: downloadArtifactEndpoint.url,
			headers: {...downloadArtifactEndpoint.headers, Authorization: `token ${myToken}`},
			followRedirect: false,
		})

		const artifactUrl = downloadArtifactResponse.headers.location

		console.log(`Downloading ${artifactUrl}`)

		const fileName = 'backstop_report.zip'
		const downloadStream = got.stream(artifactUrl)
		const fileWriterStream = fs.createWriteStream(fileName)
		await asyncStream(downloadStream, fileWriterStream)

		// todo: configure this -d when path differs?
		// await exec.exec('unzip', ['-o', fileName,  '-d', 'backstop_data'])
		await exec.exec('unzip', ['-o', fileName])


	} catch (error) {
		console.log('something went wrong')
		console.log(error)
		core.setFailed(error.message)
	}
}

async function commitResult() {
	console.log('committing result')
	await exec.exec('git', ['add', 'backstop_data'])
	await exec.exec('git', ['config', '--global', 'user.email', 'github@github.com'])
	await exec.exec('git', ['config', '--global', 'user.name', 'github'])
	// todo: make commit message configurable
	await exec.exec('git', ['commit', '-m', 'Approved new backstop reference images'])
	await exec.exec('git', ['push'])
}

downloadArtifact().then(() => {
	return approve().then(() => {
		return commitResult()
	})
})
