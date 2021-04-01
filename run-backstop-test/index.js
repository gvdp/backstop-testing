import {findFilesToUpload} from './search'

const exec = require('@actions/exec')
const core = require('@actions/core')
const io = require('@actions/io')
const artifact = require('@actions/artifact')
const quote = require('quote')
const fs = require('fs')
const path = require('path')

console.log('Starting backstop action')

const configFileLocation = core.getInput('backstop-config')
const reportName = core.getInput('report-name')
const backstopFolder = core.getInput('backstop-data-folder')

const configFile = fs.readFileSync(path.join(process.cwd(), configFileLocation))
const customConfig = JSON.parse(configFile)

console.log('config parsed')

// todo: make this input parameters i/o env variable?
const baseUrl = process.env.BASE_URL || 'http://host.docker.internal:8000'
const urlToReplace = process.env.URL_TO_REPLACE || 'http://localhost:8000'
console.log('base', process.env.BASE_URL)
console.log('replace', process.env.URL_TO_REPLACE)
if (process.env.BASE_URL && process.env.URL_TO_REPLACE) {
	console.log('replacing urls')
	customConfig.scenarios.forEach((scenario) => {
		scenario.url = scenario.url.replace(urlToReplace, baseUrl)
	})
}


// removes -t parameter for run because ci agent is not a tty terminal
customConfig.dockerCommandTemplate = 'docker run --rm -i --mount type=bind,source="{cwd}",target=/src backstopjs/backstopjs:{version} {backstopCommand} {args}'
fs.writeFileSync(path.join(process.cwd(), configFileLocation), JSON.stringify(customConfig))

console.log('Running backstop with config', customConfig)


async function upload() {

	const artifactClient = artifact.create()
	const searchResult = await findFilesToUpload(backstopFolder)
	const rootDirectory = '.'

	try {
		console.log('Uploading report files')
		//todo: set name to include branch name
		await artifactClient.uploadArtifact(reportName, searchResult.filesToUpload, rootDirectory, {
			continueOnError: false,
		})
	} catch (error) {
		console.error('Upload failed')
		console.log(error)
		core.setFailed(error.message)
	}
}


async function getPathOfGlobalYarnExecutables(yarnPath) {
	// todo: same as in other action, could be extracted
	let bin = ''
	const options = {
		listeners: {
			stdout: (data) => {
				bin += data.toString()
			},
		},
	}
	await exec.exec(quote(yarnPath), ['global', 'bin'], options)
	return bin
}

async function runTest() {
	const yarnPath = await io.which('yarn', true)

	try {


		console.log('adding backstop')
		const backstopVersion = core.getInput('backstop-version')
		await exec.exec(quote(yarnPath), ['global', 'add', `backstopjs@${backstopVersion}`])
		const executablePath = await getPathOfGlobalYarnExecutables(yarnPath)

		// todo: use configured .json location
		await exec.exec(`${executablePath.trim()}/backstop`, ['test', '--docker'])

	} catch (err) {
		console.error('Backstop test failing with ', err)
		core.setFailed(err.message)
		return upload()
	}
	console.log('backstop test done')
}

runTest()
