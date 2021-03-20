// const core = require('@actions/core')

const upload = require('upload-artifact/index')

const path = [
	'backstop_data/html_report/',
	'backstop_data/bitmaps_test/',
	'backstop_data/bitmaps_reference/',
]

const rootDirectory = '.' // Also possible to use __dirname
const options = {
	continueOnError: false,
}

async function run() {
	try {
		await upload()

	}	catch (error) {
		// core.setFailed(error.message)
	}
}

run()
