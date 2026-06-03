# Validation Summary: How to Build a Voice-Enabled App with AWS Lex and Polly

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Lex V2
- Amazon Polly
- AWS Lambda
- Amazon DynamoDB
- Amazon Comprehend
- AWS CloudFormation
- Boto3 for Python
- SSML

## Sources Consulted
- AWS CloudFormation `AWS::Lex::Bot`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lex-bot.html
- AWS CloudFormation `AWS::Lex::Bot` slot value elicitation settings: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-lex-bot-slotvalueelicitationsetting.html
- AWS CloudFormation `AWS::Lex::Bot` prompt specification: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lex-bot-promptspecification.html
- AWS CloudFormation `AWS::Lex::Bot` fulfillment code hook settings: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-lex-bot-fulfillmentcodehooksetting.html
- AWS CloudFormation Lex bot alias locale settings and Lambda code hook settings: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-lex-bot-botaliaslocalesettings.html
- Amazon Lex V2 Lambda response format: https://docs.aws.amazon.com/lexv2/latest/dg/lambda-response-format.html
- Boto3 Lex V2 `recognize_text`: https://docs.aws.amazon.com/botocore/latest/reference/services/lexv2-runtime/client/recognize_text.html
- Boto3 Lex V2 `recognize_utterance`: https://docs.aws.amazon.com/boto3/latest/reference/services/lexv2-runtime/client/recognize_utterance.html
- Boto3 Polly `synthesize_speech`: https://docs.aws.amazon.com/boto3/latest/reference/services/polly/client/synthesize_speech.html
- Amazon Polly voice engines: https://docs.aws.amazon.com/polly/latest/dg/voice-engines-polly.html
- Amazon Polly supported SSML tags: https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html
- Amazon Lex V2 supported languages and locales: https://docs.aws.amazon.com/lexv2/latest/dg/how-languages.html
- Boto3 Comprehend `detect_dominant_language`: https://docs.aws.amazon.com/boto3/latest/reference/services/comprehend/client/detect_dominant_language.html
- Boto3 DynamoDB table query and update item documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/query.html

## Issues Found
- The Lex CloudFormation prompt configuration used `MessageGroups`, but CloudFormation expects `MessageGroupsList` for `PromptSpecification`. Updated all slot prompts.
- The Lex slot definitions omitted the required `SlotConstraint` property in `ValueElicitationSetting`. Added `SlotConstraint: Required` for the required reservation slots.
- The bot definition described Lambda fulfillment but did not enable intent fulfillment hooks or show alias Lambda hook configuration. Added `FulfillmentCodeHook` on fulfilled intents and `TestBotAliasSettings` with a Lambda code hook placeholder, plus a note that the role, Lambda, and invoke permission are defined elsewhere.
- The fulfillment Lambda referenced `handle_cancel_reservation` without defining it. Added a cancellation handler that queries the session index and updates the reservation status.
- The Lambda used `datetime.utcnow()`, which is deprecated in current Python. Replaced it with timezone-aware `datetime.now(timezone.utc)`.
- DynamoDB query examples used raw expression strings. Updated them to use Boto3's `Key` condition helper, matching official resource examples.
- The ElicitSlot response reused the incoming intent state unchanged. Updated it to return the intent with `state: InProgress`, which is appropriate when asking for a corrected slot value.
- The Polly SSML example used `<emphasis>` with the neural engine, but Amazon Polly does not support the `<emphasis>` SSML tag for neural voices. Replaced it with `<say-as interpret-as="characters">` for reservation IDs and adjusted the prose from "emphasis" to "pacing."
- The SSML helper inserted user text directly into XML. Added XML escaping before adding SSML tags.
- The `recognize_utterance` integration treated response fields like `messages` and `sessionState` as already-decoded structures. Boto3 returns those fields compressed and base64-encoded, so a decoder was added and `responseContentType` was set for text output.
- The WebSocket handler left `response` undefined for unsupported actions. Added a `400` response for invalid actions.
- The multi-language code block used Boto3 clients and base64 without defining imports or clients in that block. Added the missing imports and client initialization.

## Review Notes
- The CloudFormation snippet is still an excerpt, not a full deployable stack. It assumes supporting IAM role, Lambda function, DynamoDB table/index, Lambda permission, bot version, and production alias resources are defined elsewhere.
