(
cd approve-images
yarn && yarn build
)
(
cd run-backstop-test
yarn && yarn build
)
  git add .
  npx standard-version
  git push --follow-tags origin main
