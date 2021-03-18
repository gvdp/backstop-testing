const artifact = require('@actions/artifact')
const core = require('@actions/core')
const artifactClient = artifact.create()
const artifactName = 'backstop-results'
const files = [
	'archive.js',
]

const rootDirectory = '.' // Also possible to use __dirname
const options = {
	continueOnError: false,
}

async function run() {
	try {
await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options).then(response => {
	console.log('artifact uploaded')
	console.log(response)
})


	}
	catch (error) {
		core.setFailed(error.message);
	}
}

run();
