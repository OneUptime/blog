# Validation Summary: How to Use CodeCatalyst Blueprints for Project Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CodeCatalyst
- CodeCatalyst Blueprints
- CodeCatalyst custom blueprints
- AWS CLI for CodeCatalyst
- CodeCatalyst workflows
- TypeScript
- AWS CDK and AWS SAM

## Sources Consulted
- Amazon CodeCatalyst migration notice: https://docs.aws.amazon.com/codecatalyst/latest/userguide/migration.html
- Set up CodeCatalyst projects with blueprints: https://docs.aws.amazon.com/codecatalyst/latest/userguide/blueprints.html
- Creating a comprehensive project with CodeCatalyst blueprints: https://docs.aws.amazon.com/codecatalyst/latest/userguide/project-blueprints.html
- Creating a project with a blueprint: https://docs.aws.amazon.com/codecatalyst/latest/userguide/create-project-with-bp.html
- AWS CLI `codecatalyst create-project` reference: https://docs.aws.amazon.com/cli/latest/reference/codecatalyst/create-project.html
- Getting started with custom blueprints: https://docs.aws.amazon.com/codecatalyst/latest/userguide/getting-started-bp.html
- Developing a custom blueprint: https://docs.aws.amazon.com/codecatalyst/latest/userguide/develop-bp.html
- Publishing a custom blueprint: https://docs.aws.amazon.com/codecatalyst/latest/userguide/publish-bp.html
- Adding repository and source code components to a blueprint: https://docs.aws.amazon.com/codecatalyst/latest/userguide/comp-repo-source-bp.html
- Adding workflow components to a blueprint: https://docs.aws.amazon.com/codecatalyst/latest/userguide/comp-workflow-bp.html
- Workflow YAML definition: https://docs.aws.amazon.com/codecatalyst/latest/userguide/workflow-reference.html

## Issues Found
- Added the current CodeCatalyst availability caveat: AWS closed new customer access on November 7, 2025, while existing customers can continue using existing spaces.
- Replaced inaccurate built-in blueprint names and descriptions with names and capabilities from the current AWS documentation.
- Corrected the AWS CLI example. The documented `aws codecatalyst create-project` command does not support a `--blueprint` option, so the post now states that blueprint selection/configuration is handled in the CodeCatalyst console.
- Replaced the unsupported internal YAML parameter schema with a TypeScript `Options` interface example, which is how the custom blueprint wizard is generated.
- Corrected custom blueprint creation and publishing guidance. Current AWS docs describe creating a custom blueprint through CodeCatalyst space settings and using `yarn blueprint:preview` / `yarn blueprint:release`, not `npx create-blueprint` or `npx publish-blueprint`.
- Updated the custom blueprint TypeScript example to use documented component packages for source repositories and workflows, and removed unsupported `repo.copyStaticFiles()` usage.
- Corrected the workflow example to use documented workflow fields such as `Name`, `SchemaVersion`, `Type: PUSH`, `Inputs`, and `Identifier: aws/build@v1`.

## Review Notes
CodeCatalyst remains usable for existing customers, but AWS does not plan to add new features. Future updates to this post should consider whether recommending CodeCatalyst is still appropriate for new project standardization work.
