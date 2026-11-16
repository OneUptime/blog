# How to Trace ReAct Output Parser Failures After a Successful Tool Call

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, LangChain, Tracing, Python

Description: Separate successful tool execution from the next ReAct parser failure and preserve the exact failing model output for diagnosis.

A tool returns the correct database record, but the agent still fails with an output parsing error. The trace often makes this look contradictory because the final error is attached to the whole run. In a text-based ReAct loop, tool execution and parsing the next model response are separate operations. One can succeed while the other fails.

Trace those operations independently, then replay the parser against the exact text it received. This usually narrows the problem faster than rerunning the full agent and repeating external tool calls.

## Identify which agent implementation is running

Current LangChain agents and older text-based ReAct agents do not share every parser contract. This article concerns classic text ReAct applications using `langchain_classic`, not a claim that every modern tool-calling agent expects `Action:` text.

The [classic create_react_agent reference](https://reference.langchain.com/python/langchain-classic/agents/react/agent/create_react_agent) documents required prompt variables, including tool descriptions, tool names, and the agent scratchpad. It also identifies that implementation as older and recommends modern agent construction for new applications.

Capture package versions, parser class, prompt version, stop settings, and output limits. A generic label such as `react-agent` is not sufficient to reproduce the contract.

## Trace the handoff after the tool

A useful timeline contains:

```text
model.decision.1 -> parse.1 -> tool.lookup
                                    |
                                    v
                         assemble_next_input
                                    |
                                    v
                         model.decision.2 -> parse.2 [failed]
```

These are proposed application spans. Keep the tool span successful if it actually succeeded. Attach the parser exception to `parse.2` and mark the overall run failed separately.

Record the tool call ID, result status, result reference, the next rendered-input reference, model-output reference, and parser version. This establishes whether the correct observation reached the next prompt. A tool result stored in an application variable is not evidence that it was included in the model input.

Keep sensitive content in an access-controlled payload store with a suitable retention period. Trace attributes can hold references, hashes, sizes, and versions rather than the entire tool result or model response.

## Reproduce the parser failure without a model call

Install `langchain-classic` for this example. It deliberately exercises the single-input text parser with a valid action, a valid final response, and malformed output:

```python
from langchain_classic.agents.output_parsers.react_single_input import (
    ReActSingleInputOutputParser,
)
from langchain_core.exceptions import OutputParserException

parser = ReActSingleInputOutputParser()
fixtures = {
    "action": "Action: lookup_account\nAction Input: account-17",
    "final": "Final Answer: The account is active.",
    "malformed": "The lookup succeeded, so the account is active.",
}

for name, text in fixtures.items():
    try:
        parsed = parser.parse(text)
        print(name, type(parsed).__name__)
    except OutputParserException:
        print(name, "parser_failure")
```

The [ReActSingleInputOutputParser reference](https://reference.langchain.com/python/langchain-classic/agents/output_parsers/react_single_input/ReActSingleInputOutputParser) describes action and final-answer formats. The malformed fixture is perfectly understandable English, but it does not satisfy that parser's protocol.

For your incident, load the saved model output as the fixture. Do not reconstruct it from displayed text: streaming concatenation, whitespace cleanup, or truncation may have changed what the parser actually saw.

## Check the likely causes in order

First inspect prompt assembly. Did the next input contain the original format instructions and the tool observation? Was the scratchpad duplicated, omitted, or escaped into an unexpected shape? Compare a successful run immediately before the prompt or framework change.

Next inspect termination. A model output cut off by an output limit or an incorrectly chosen stop sequence can fail parsing even when its beginning is valid. Preserve the provider's finish reason and distinguish truncation from a complete response in the wrong format.

Then inspect output handling. A parser expecting a completed string should not be fed arbitrary partial transport chunks. Check whether middleware stripped the final marker or appended an unrelated message. Finally, confirm the parser matches the prompt: different ReAct variants use different text grammars.

## Bound repairs and protect successful effects

LangChain's [handle_parsing_errors documentation](https://reference.langchain.com/python/langchain-classic/agents/agent/AgentExecutor/handle_parsing_errors) explains that parser errors can be raised or returned to the model as an observation. Enabling repair does not guarantee termination or prevent another tool call.

Keep a bounded parser-repair count and record each repair as a separate model attempt. A repaired run can be successful while still contributing to parser-failure metrics. Avoid feeding raw exception text containing sensitive data back into the model without filtering.

If the successful tool changed external state, do not replay it merely to retry parsing. Preserve the result and use an idempotency mechanism or verified readback before any redispatch. Parser recovery and tool retry are different policies.

Validate the fix against the saved failing output, the corrected prompt path, a truncated output, and a tool-success/parser-failure sequence. The final trace should explain exactly which boundary failed and preserve successful tool work rather than burying it under one generic agent error.
