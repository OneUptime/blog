# Validation Summary: How to Configure Amazon Connect for a Contact Center

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Connect
- AWS CLI
- Amazon Connect Flow language
- AWS Lambda
- Python / boto3
- Amazon S3
- Amazon DynamoDB
- Amazon Connect metrics APIs

## Sources Consulted
- AWS CLI Command Reference: create-instance - https://docs.aws.amazon.com/cli/latest/reference/connect/create-instance.html
- AWS CLI Command Reference: search-available-phone-numbers - https://docs.aws.amazon.com/cli/latest/reference/connect/search-available-phone-numbers.html
- AWS CLI Command Reference: claim-phone-number - https://docs.aws.amazon.com/cli/latest/reference/connect/claim-phone-number.html
- AWS CLI Command Reference: create-queue - https://docs.aws.amazon.com/cli/latest/reference/connect/create-queue.html
- AWS CLI Command Reference: create-hours-of-operation - https://docs.aws.amazon.com/cli/latest/reference/connect/create-hours-of-operation.html
- AWS CLI Command Reference: create-routing-profile - https://docs.aws.amazon.com/cli/latest/reference/connect/create-routing-profile.html
- AWS CLI Command Reference: create-contact-flow - https://docs.aws.amazon.com/cli/latest/reference/connect/create-contact-flow.html
- AWS CLI Command Reference: create-user - https://docs.aws.amazon.com/cli/latest/reference/connect/create-user.html
- AWS CLI Command Reference: update-instance-storage-config - https://docs.aws.amazon.com/cli/latest/reference/connect/update-instance-storage-config.html
- AWS CLI Command Reference: get-current-metric-data - https://docs.aws.amazon.com/cli/latest/reference/connect/get-current-metric-data.html
- Amazon Connect Flow language: Example flow - https://docs.aws.amazon.com/connect/latest/APIReference/flow-language-example.html
- Amazon Connect Flow language: Actions and conditions - https://docs.aws.amazon.com/connect/latest/APIReference/flow-language-actions.html
- Amazon Connect Flow language: GetParticipantInput - https://docs.aws.amazon.com/connect/latest/APIReference/participant-actions-getparticipantinput.html
- Amazon Connect Flow language: UpdateContactTargetQueue - https://docs.aws.amazon.com/connect/latest/APIReference/contact-actions-updatecontacttargetqueue.html
- Amazon Connect Flow language: TransferContactToQueue - https://docs.aws.amazon.com/connect/latest/APIReference/contact-actions-transfercontacttoqueue.html
- Amazon Connect Administrator Guide: Invoke AWS Lambda function block - https://docs.aws.amazon.com/connect/latest/adminguide/invoke-lambda-function-block.html

## Issues Found
- The `claim-phone-number` command used `--phone-number-country-code` and `--phone-number-type`, which are valid for searching but not for claiming. Updated the example to pass the selected E.164 phone number with `--phone-number`.
- The sample Amazon Connect instance ARN used a 9-digit account placeholder. Updated it to a structurally valid 12-digit account placeholder.
- The contact flow JSON used `Timeout` for `GetParticipantInput`; the Flow language parameter is `InputTimeLimitSeconds`. Updated the field name.
- The contact flow conditions used `Operand`; the Flow language expects `Operands` as a list. Updated both DTMF branch conditions.
- The contact flow used `TransferToQueue`, which is not the current Flow language action for putting an inbound contact into a queue. Updated the example to set the target queue with `UpdateContactTargetQueue` and then transfer with `TransferContactToQueue`.
- The contact flow referenced `default-queue` without defining it. Added a default queue action so the error and fallback transitions resolve.
- The Lambda section said return values become contact attributes. Amazon Connect Lambda results can be used by subsequent flow blocks or copied into contact attributes with a Set contact attributes block, so the wording was corrected.
- The call recording comment implied `update-instance-storage-config` enables recording from scratch. Updated the comment to clarify it updates an existing recording storage configuration.

## Review Notes
- AWS CLI was not installed in the local environment, so command verification was performed against the official AWS CLI Command Reference rather than local `aws --help` output.
- The `create-instance` and `update-instance-storage-config` AWS CLI docs currently mark those APIs as preview and subject to change.
- Amazon Connect documentation now refers to the service as Amazon Connect Customer in some places, while the post uses the widely recognized Amazon Connect name.
