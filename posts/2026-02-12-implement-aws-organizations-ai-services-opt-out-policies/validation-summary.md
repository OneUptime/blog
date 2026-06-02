# Validation Summary: How to Implement AWS Organizations AI Services Opt-Out Policies

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Organizations
- AWS Organizations AI services opt-out policies
- AWS CLI
- AWS CloudFormation
- AWS Config organization rules
- AWS AI services including Amazon Rekognition, Amazon Transcribe, Amazon Comprehend, Amazon Lex, Amazon Polly, Amazon Textract, and Amazon Translate

## Sources Consulted
- AWS Organizations User Guide: AI services opt-out policies - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_ai-opt-out.html
- AWS Organizations User Guide: AI services opt-out policy syntax and examples - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_ai-opt-out_syntax.html
- AWS Organizations User Guide: Opt out from all supported AWS AI services - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_ai-opt-out_all.html
- AWS Organizations User Guide: Getting started with AI services opt-out policies - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies-ai-opt-out_getting-started.html
- AWS Organizations User Guide: Enabling a policy type - https://docs.aws.amazon.com/organizations/latest/userguide/enable-policy-type.html
- AWS Organizations API Reference: EnablePolicyType - https://docs.aws.amazon.com/organizations/latest/APIReference/API_EnablePolicyType.html
- AWS Organizations User Guide: Viewing effective policies - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_effective.html
- AWS CloudFormation Template Reference: AWS::Organizations::Policy - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-organizations-policy.html
- AWS CLI Command Reference: put-organization-config-rule - https://docs.aws.amazon.com/cli/latest/reference/configservice/put-organization-config-rule.html
- AWS Service Terms - https://aws.amazon.com/service-terms/

## Issues Found
- The strict opt-out policy examples used `@@operators_allowed_for_child_policies: ["@@none"]` under `services` and `default`, but not under `opt_out_policy`. AWS's own strict example places the operator under `opt_out_policy` as well to prevent child policies from changing the assigned `optOut` value. Added that operator to the JSON and CloudFormation examples.
- The per-OU configuration could be misread as compatible with the earlier fully locked root policy. Added a short caveat that the per-OU opt-in example should be used instead of a fully locked root policy, because a locked root policy prevents child OU opt-in overrides.
- The AWS Config example used `MaximumExecutionFrequency: "TwelveHours"`, which is not a valid enum value. Changed it to the documented AWS Config value `Twelve_Hours`.
- The FAQ and best-practice wording said `@@operators_allowed_for_child_policies: @@none` prevents any overrides without clarifying placement. Updated the wording to say the operator must be used at the relevant levels, including under `opt_out_policy`.
- The prerequisites listed the AI services opt-out policy type as already enabled even though Step 1 enables it. Changed that prerequisite to the permission needed to enable and manage the policy type.

## Review Notes
The post's overall explanation, AWS Organizations CLI flow, CloudFormation resource type, effective policy verification command, and Bedrock caveat are consistent with the consulted AWS documentation. The local workspace does not have the AWS CLI installed, so CLI syntax was validated against official AWS CLI and AWS Organizations documentation rather than local `aws --help` output.
