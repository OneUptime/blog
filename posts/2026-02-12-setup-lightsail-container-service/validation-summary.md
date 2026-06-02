# Validation Summary: How to Set Up a Lightsail Container Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Lightsail Container Service
- AWS CLI for Lightsail
- Docker
- Node.js
- Express
- Lightsail SSL/TLS certificates and custom domains

## Sources Consulted
- AWS CLI Command Reference: create-container-service - https://docs.aws.amazon.com/cli/latest/reference/lightsail/create-container-service.html
- AWS CLI Command Reference: create-container-service-deployment - https://awscli.amazonaws.com/v2/documentation/api/2.34.7/reference/lightsail/create-container-service-deployment.html
- AWS CLI Command Reference: get-container-log - https://awscli.amazonaws.com/v2/documentation/api/2.34.7/reference/lightsail/get-container-log.html
- Amazon Lightsail User Guide: Container services - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-container-services.html
- Amazon Lightsail User Guide: Create and manage container service deployments - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-container-services-deployments.html
- Amazon Lightsail User Guide: Push, view, and delete container images - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-pushing-container-images.html
- Amazon Lightsail User Guide: Create SSL/TLS certificates for container service domains - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-creating-container-services-certificates.html
- Amazon Lightsail User Guide: Enable secure web access with custom domains - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-enabling-container-services-custom-domains.html
- Amazon Lightsail Pricing - https://aws.amazon.com/lightsail/pricing/?c=containers&p=ft&z=3
- Node.js release schedule - https://github.com/nodejs/release
- Express package on npm - https://www.npmjs.com/express

## Issues Found
- The Lightsail container service power table had outdated vCPU, RAM, and price values for micro through xlarge. Updated the table to match the current AWS Lightsail pricing page.
- The Node.js example used `node:18-alpine`, but Node.js 18 is end-of-life in 2026. Updated the Dockerfile to use `node:22-alpine`, which is still supported.
- The Docker example copied package files and ran npm, but the post did not provide a `package.json`, so the build would fail as written. Added a minimal `package.json` snippet using the current Express 5 line and changed the install command to `npm install --omit=dev` so the example works without requiring a generated lockfile in the post.
- The deployment verification command prepended `https://` to the value returned by `containerServices[0].url`, but AWS documents the default domain URL as already including `https://`. Changed the curl command to use `$URL` directly.
- The custom domain instructions said to point the CNAME to the Lightsail container service URL. Updated the wording to point to the hostname without the `https://` prefix, which is the correct DNS target form.
- The post claimed Lightsail performs rolling deployments with no downtime. The official documentation states that deployments create new deployment versions and that failed deployments keep the previous active deployment if one exists, but it does not document a no-downtime rolling deployment guarantee. Reworded the claim to match the documented behavior.

## Review Notes
- The AWS CLI is not installed in this workspace, so command validation was performed against official AWS CLI documentation rather than local `aws --help` output.
- The Lightsail public endpoint accepts HTTPS publicly while the service load balancer can connect to the container over HTTP, so the post's use of `"80": "HTTP"` with an HTTPS public URL is correct.
- The GNU `date -d` syntax in the log example works on Linux but not on macOS without GNU coreutils.
