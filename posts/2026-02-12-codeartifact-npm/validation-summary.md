# Validation Summary: How to Use CodeArtifact with npm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodeArtifact
- AWS CLI
- npm
- Node.js
- AWS CodeBuild
- IAM policies
- `.npmrc` configuration

## Sources Consulted
- AWS CodeArtifact User Guide: Configure and use npm with CodeArtifact: https://docs.aws.amazon.com/codeartifact/latest/ug/npm-auth.html
- AWS CodeArtifact User Guide: Authentication and tokens: https://docs.aws.amazon.com/codeartifact/latest/ug/tokens-authentication.html
- AWS CLI Command Reference: `aws codeartifact login`: https://docs.aws.amazon.com/cli/latest/reference/codeartifact/login.html
- AWS CLI Command Reference: `aws codeartifact list-repositories-in-domain`: https://docs.aws.amazon.com/cli/latest/reference/codeartifact/list-repositories-in-domain.html
- AWS CodeArtifact User Guide: View or modify a repository configuration: https://docs.aws.amazon.com/codeartifact/latest/ug/config-repos.html
- AWS CodeArtifact User Guide: Connect a CodeArtifact repository to a public repository: https://docs.aws.amazon.com/codeartifact/latest/ug/external-connection.html
- AWS CodeArtifact User Guide: Packages overview and publishing permissions: https://docs.aws.amazon.com/codeartifact/latest/ug/packages-overview.html
- AWS CodeBuild User Guide: Build specification reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- npm Docs: `.npmrc`: https://docs.npmjs.com/cli/v11/configuring-npm/npmrc
- npm Docs: Registry: https://docs.npmjs.com/using-npm/registry.html
- npm Docs: Config `scope`: https://docs.npmjs.com/using-npm/config/

## Issues Found
- The prerequisites did not mention the AWS CLI version requirement for npm 10 or newer. Added the AWS CLI 2.9.5+ caveat from the AWS CodeArtifact npm documentation.
- The post implied `aws codeartifact login` always configures `always-auth=true`. AWS documents this as only added for npm 6 and lower, so the wording was corrected.
- Manual and `.npmrc` examples set `always-auth=true` without explaining that it is only needed for npm 6 and lower. Added comments limiting that setting to npm 6 and lower.
- The CodeBuild examples authenticated in `pre_build` while `npm ci` was placed in the `install` phase. CodeBuild runs `install` before `pre_build`, so `npm ci` could run before npm was authenticated. Moved authentication into the `install` phase before `npm ci`.
- The IAM policy listed `codeartifact:PutPackageMetadata` as required for npm publishing. AWS documents npm publishing as requiring `codeartifact:PublishPackageVersion`; removed the unnecessary action from the "needs these permissions" example.
- The troubleshooting command queried `upstreams` from `list-repositories-in-domain`, but that API returns repository summaries and does not include upstream or external connection details. Replaced it with `describe-repository` and a query for `repository.upstreams` and `repository.externalConnections`.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was checked against the official AWS CLI command reference and AWS CodeArtifact documentation rather than local `aws --help` output.
