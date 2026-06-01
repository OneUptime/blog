# Validation Summary: How to Use CodePipeline V2 for Advanced Pipeline Features

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodePipeline V2
- AWS CodePipeline triggers and execution modes
- AWS CodePipeline variables and action namespaces
- AWS CodePipeline stage rollback and conditions
- AWS CodeBuild buildspec exported variables
- AWS CloudFormation
- AWS CLI
- Amazon ECS deployment actions
- Amazon CloudWatch alarms

## Sources Consulted
- AWS CodePipeline User Guide: Pipeline types and V1/V2 feature comparison: https://docs.aws.amazon.com/codepipeline/latest/userguide/pipeline-types-planning.html
- AWS CodePipeline User Guide: Pipeline declaration, triggers, and pipeline variables: https://docs.aws.amazon.com/codepipeline/latest/userguide/pipeline-requirements.html
- AWS CodePipeline User Guide: Automate starting pipelines using triggers and filtering: https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-triggers.html
- AWS CodePipeline User Guide: Variables reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/reference-variables.html
- AWS CodePipeline User Guide: Action declaration and runOrder behavior: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-requirements.html
- AWS CodePipeline User Guide: Stage conditions: https://docs.aws.amazon.com/codepipeline/latest/userguide/stage-conditions.html
- AWS CodePipeline User Guide: Pipeline execution modes: https://docs.aws.amazon.com/codepipeline/latest/userguide/concepts-how-it-works.html
- AWS CloudFormation Template Reference: AWS::CodePipeline::Pipeline and GitConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-codepipeline-pipeline.html
- AWS CodePipeline API Reference: PipelineDeclaration: https://docs.aws.amazon.com/codepipeline/latest/APIReference/API_PipelineDeclaration.html
- AWS CLI Command Reference: update-pipeline: https://docs.aws.amazon.com/cli/latest/reference/codepipeline/update-pipeline.html
- AWS CodePipeline pricing: https://aws.amazon.com/codepipeline/pricing/

## Issues Found
- The post described parallel actions within a stage as a V2-only improvement. CodePipeline supports serial and parallel actions in stages through `runOrder` generally, so the introduction, feature table, and Step 4 wording were corrected.
- The feature table listed "stage variables." AWS documents pipeline-level variables and action output variables, so the table was corrected.
- The trigger example placed `tags` directly under `gitConfiguration`. AWS defines tags inside a `push` filter, so the example was changed to use separate push filters for branch/file-path matching and tag matching.
- The `update-pipeline` example implied a partial pipeline declaration would work. AWS requires the full pipeline structure for `update-pipeline`, so the command was changed to a focused `triggers` block with explanatory text.
- The CodeBuild output variable example put the namespace on the downstream deploy action. AWS requires the producing action to declare the namespace, so the example was corrected to assign `namespace` to the CodeBuild action.
- The rollback example used `onFailure` while describing CloudWatch alarm monitoring after a successful deployment. That behavior belongs in an `onSuccess` condition with `ROLLBACK`, so the snippet and explanation were updated.
- The post omitted that stage rollback is unavailable in `PARALLEL` execution mode. A caveat was added.
- The pricing guidance stated that V2 is usually cheaper. AWS pricing depends on action execution minutes versus active V1 pipeline count, so the recommendation was softened to be usage-dependent.

## Review Notes
The CloudFormation example remains intentionally minimal and uses broad managed IAM policies for brevity. For production use, least-privilege IAM policies and explicit artifact encryption key choices should be considered.
