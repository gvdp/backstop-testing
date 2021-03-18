const artifact = require('@actions/artifact');
const artifactClient = artifact.create()
const artifactName = 'backstop-results';
const path = '.'
const options = {
	createArtifactFolder: false
}

const downloadResponse = await artifactClient.downloadArtifact(artifactName, path, options)
