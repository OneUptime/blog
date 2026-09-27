# How to Extract Fields from Multiline Log Bodies with OpenSearch PPL parse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Observability, Logging

Description: Extract fields from multiline log bodies with Java-compatible PPL parse expressions, full-body matching, and explicit handling of unmatched events.

A parser that works for a one-line log can fail as soon as a stack trace is attached. The visible prefix may be unchanged, but the stored `body` now contains line terminators that a plain dot does not normally consume.

OpenSearch PPL `parse` uses Java regular expressions and matches the whole field. Build the expression around the entire stored event, including its continuation lines, and preview the extracted fields alongside the original body.

## Confirm that the event is already assembled

This guide assumes one indexed document contains the complete message:

```text
ERROR order=4821 reason=payment timeout
java.net.SocketTimeoutException: Read timed out
    at example.Payments.charge(Payments.java:42)
    at example.Checkout.submit(Checkout.java:18)
```

Inspect `_source` to confirm that assumption. A UI can wrap a long line visually without the stored string containing a newline. Conversely, a collector can index each stack-trace line as a separate event.

A query-time regular expression does not combine separate OpenSearch documents. If each line was indexed separately, fix multiline assembly in the ingestion path, or analyze those individual events using a shared correlation identifier.

## Match the header and consume the rest

For the example format, use:

```text
source=`application-logs`
| parse body 'ERROR order=(?<orderid>[0-9]+) reason=(?<reason>[^\r\n]+)[\s\S]*'
| fields body, orderid, reason
| head 20
```

The intended values are `4821` and `payment timeout`. The reason capture stops at the first CR or LF character, while the final character class consumes everything that remains. These examples assume LF, CRLF, or CR line endings; other Unicode line separators are not excluded from the reason capture. It also accepts a header-only event because `*` allows an empty remainder.

Named groups use letters and digits here, which satisfies Java's group-name rules. The resulting fields are strings. Use a separate numeric alias if you need to calculate with an extracted measurement; an order identifier normally belongs in a string field.

The [PPL parse reference](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/parse/) documents whole-field matching and named string captures. The [Java Pattern reference](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/regex/Pattern.html) defines the regex behavior used by this command.

## Understand multiline and dot-all modes

Java's multiline mode, `(?m)`, changes how line anchors behave. It does not by itself make `.` match newline characters. Dot-all mode, `(?s)`, changes the dot's behavior.

An alternative for this header format is:

```text
source=`application-logs`
| parse body '(?s)ERROR order=(?<orderid>[0-9]+) reason=(?<reason>[^\r\n]+).*'
| fields orderid, reason
| head 20
```

Both examples keep the reason bounded to the first line. A broad capture such as `(?<reason>.*)` under dot-all mode would also absorb the stack trace, potentially creating a unique group for each event. That may be useful for inspection but poor for counting failure reasons.

Do not add leading `.*` automatically. In this format, `ERROR` belongs at the beginning. If the real producer includes a timestamp or thread prefix, model that prefix deliberately so the expression does not accidentally select an unrelated embedded message.

## Handle the API escaping layer

The query editor receives PPL text. The REST API receives a JSON string containing that text, so each regex backslash needs JSON escaping:

```http
POST /_plugins/_ppl
{
  "query": "source=`application-logs` | parse body 'ERROR order=(?<orderid>[0-9]+) reason=(?<reason>[^\\r\\n]+)[\\s\\S]*' | fields body, orderid, reason | head 20"
}
```

The decoded PPL expression is the same as the first query. Use a JSON serializer when constructing requests programmatically. Repeatedly adding backslashes without inspecting the decoded query makes it difficult to tell whether a failure comes from JSON, PPL, or the regex itself. The [query API reference](https://docs.opensearch.org/latest/sql-and-ppl/sql-and-ppl-api/index/) describes the request envelope.

## Check extraction coverage before counting

Keep a small fixture with a multiline stack trace, a single-line event, Windows-style CRLF line endings, a missing `reason`, and an unrelated message. Inspect whether each row matches the intended contract.

Once the preview is correct, filter successful captures before aggregation:

```text
source=`application-logs`
| parse body 'ERROR order=(?<orderid>[0-9]+) reason=(?<reason>[^\r\n]+)[\s\S]*'
| where isnotnull(reason) and reason != ''
| stats count() as failures by reason
| sort - failures
```

Retain a separate count of candidate events to expose parsing failures. A lower result count can reflect a changed log format rather than fewer application errors.

The documented `parse` limitations also matter: avoid re-parsing a captured field, overwriting the source body, or filtering a parsed grouping field after `stats`. Extract what you need from the original body in one pass and filter before grouping.

## Conclusion

First verify that multiline content is one stored event. Then match the complete body, bound captures to the intended line, and consume continuation text explicitly. Preview coverage before aggregating so malformed or newly formatted messages do not disappear silently.
