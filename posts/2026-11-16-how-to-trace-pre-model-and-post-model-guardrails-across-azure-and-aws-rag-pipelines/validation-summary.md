# Validation Summary: How to Trace Input and Output Guardrails in Azure and AWS RAG Pipelines

## Status
validated

## Post Type
Technical guide with a Python adapter example and application tracing recommendations.

## Technologies Covered
- Retrieval-augmented generation (RAG) pipelines
- Amazon Bedrock Guardrails and the ApplyGuardrail API
- Python and Boto3 bedrock-runtime
- Azure OpenAI Chat Completions, Responses, and content filtering
- Azure AI Content Safety Prompt Shields
- Application tracing, policy enforcement, and streaming release controls

## Sources Consulted
- AWS: Using ApplyGuardrail independently of model invocation — https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-independent-api.html
- AWS: ApplyGuardrail API reference — https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ApplyGuardrail.html
- Boto3: BedrockRuntime.Client.apply_guardrail — https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-runtime/client/apply_guardrail.html
- Microsoft: Azure OpenAI Chat REST reference — https://learn.microsoft.com/en-us/rest/api/microsoft-foundry/azureopenai/chat
- Microsoft: Prompt Shields concepts and integration behavior — https://learn.microsoft.com/en-us/azure/ai-services/content-safety/concepts/jailbreak-detection
- Microsoft: Prompt Shields quickstart — https://learn.microsoft.com/en-us/azure/ai-services/content-safety/quickstart-jailbreak
- Microsoft: Azure OpenAI content streaming — https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/content-streaming?view=foundry-classic
- Microsoft: Azure OpenAI Responses API — https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/responses?view=foundry-classic
- OpenTelemetry: Traces, spans, attributes, and events — https://opentelemetry.io/docs/concepts/signals/traces/
- Python: AST parsing and compilation — https://docs.python.org/3/library/ast.html

## Issues Found
No technical issues found.

## Review Notes
- The post contains implementation details and executable Python, so it qualifies for technical validation. README.md required no changes.
- Verified the Boto3 method, parameter names, nested text content structure, INPUT/OUTPUT values, and NONE/GUARDRAIL_INTERVENED decisions. The version parameter must be a string, such as "1". Published versions are supported; the API also accepts DRAFT, which does not invalidate the example's stated prerequisite.
- Parsed and compiled the extracted Python example. Eight mocked cases passed: both actions for both phases, missing and unknown actions, an invalid phase rejected before a request, and propagation of a simulated timeout. Checked the exact request arguments. No authenticated cloud calls or end-to-end pipeline tests were performed.
- The adapter intentionally stops on every intervention, including anonymization. Its surrounding explanation correctly requires a separate adapter to consume transformed output. Assessments may contain sensitive matches, and provider processing latency is distinct from caller-observed duration.
- Azure filter category results distinguish detection or severity from filtering. Prompt Shields document analysis returns detection results; independent API consumers implement enforcement themselves. Chat Completions and Responses require API-specific parsing.
- Azure asynchronous filtering can deliver content before annotations. The streaming documentation also describes a possible unevaluated final segment in default streaming; the post's requirement to complete checks on the final segment is appropriate. Strict implementations must ensure actual evaluation through independent checks or a suitable non-streaming path, rather than treating stream termination as proof of evaluation.
- Stage names, decision IDs, release events, and coverage metrics are application conventions, not claimed provider response fields. Tool authorization, output identity, bounded metric dimensions, and consequence-focused tests are sound application design recommendations.
- All five technical documentation links in the post resolved to relevant official resources. No terminal commands, configuration snippets, or explicitly deprecated APIs appear in the post. Cloud behavior remains dependent on the configured guardrail policies and supported integration.
