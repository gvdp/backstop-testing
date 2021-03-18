const artifact = require('@actions/artifact');
const artifactClient = artifact.create()
const artifactName = 'backstop-results';
const files = [
	'html_report'
]

const rootDirectory = '.' // Also possible to use __dirname
const options = {
	continueOnError: false
}

const uploadResponse = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options)
