const artifact = require('@actions/artifact')
const artifactClient = artifact.create()
const artifactName = 'backstop-results'
const files = [
	'backstop_data',
]

const rootDirectory = '.' // Also possible to use __dirname
const options = {
	continueOnError: false,
}

artifactClient.uploadArtifact(artifactName, files, rootDirectory, options).then(response => {
	console.log('artifact uploaded')
	console.log(response)
})
