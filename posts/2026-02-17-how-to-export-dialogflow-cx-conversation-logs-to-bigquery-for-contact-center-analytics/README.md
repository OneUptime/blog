# How to Export Dialogflow CX Conversation Logs to BigQuery for Contact Center Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dialogflow CX, BigQuery, Contact Center, Analytics, Conversation Logs, Google Cloud

Description: Export Dialogflow CX conversation logs to BigQuery to build contact center analytics dashboards and improve virtual agent performance over time.

---

Running a Dialogflow CX virtual agent without analytics is like flying blind. You know calls are being handled, but you have no idea which conversations are succeeding, which are failing, where customers get stuck, or what they are asking about that your agent cannot handle. Exporting conversation logs to BigQuery gives you the data foundation to answer all of these questions and continuously improve your agent.

In this post, I will cover setting up the conversation log export, structuring the data in BigQuery, and writing queries that give you actionable insights about your contact center performance.

## What Gets Exported

Dialogflow CX conversation logs contain rich data about every interaction:

- Session ID and timestamps
- User inputs (text and audio transcripts)
- Detected intents and confidence scores
- Matched pages and flows
- Agent responses
- Webhook calls and responses
- Parameter values
- Session duration and turn count

## Prerequisites

- A Dialogflow CX agent handling conversations
- BigQuery API enabled
- Cloud Logging API enabled
- Appropriate IAM permissions for log routing

## Step 1: Enable Conversation Logging

First, make sure conversation logging is enabled on your Dialogflow CX agent. By default, interaction logging may be disabled for privacy.

```python
from google.cloud import dialogflowcx_v3

def enable_conversation_logging(agent_name):
    """Enables conversation logging on a Dialogflow CX agent."""
    client = dialogflowcx_v3.AgentsClient()

    agent = client.get_agent(name=agent_name)

    # Enable interaction logging
    agent.enable_stackdriver_logging = True
    agent.enable_spell_correction = True

    client.update_agent(
        agent=agent,
        update_mask={"paths": [
            "enable_stackdriver_logging",
        ]},
    )
    print("Conversation logging enabled")

enable_conversation_logging(
    "projects/my-project/locations/us-central1/agents/AGENT_ID"
)
```

## Step 2: Create a Log Sink to BigQuery

Cloud Logging receives the conversation logs. You need a log sink to route them to BigQuery for analysis.

This sets up the log sink with a filter for Dialogflow CX interactions:

```bash
# Create a BigQuery dataset for conversation logs
bq mk --dataset \
  --location=us-central1 \
  --description="Dialogflow CX conversation logs" \
  MY_PROJECT:dialogflow_analytics

# Create a log sink that routes Dialogflow CX logs to BigQuery
gcloud logging sinks create dialogflow-to-bigquery \
  bigquery.googleapis.com/projects/MY_PROJECT/datasets/dialogflow_analytics \
  --log-filter='resource.type="global" AND logName:"dialogflow"' \
  --use-partitioned-tables \
  --description="Routes Dialogflow CX conversation logs to BigQuery"
```

After creating the sink, you need to grant the sink's service account write access to BigQuery:

```bash
# Get the sink's writer identity
SINK_SA=$(gcloud logging sinks describe dialogflow-to-bigquery --format='value(writerIdentity)')

# Grant BigQuery Data Editor role to the sink service account
gcloud projects add-iam-policy-binding MY_PROJECT \
  --member="$SINK_SA" \
  --role="roles/bigquery.dataEditor"
```

## Step 3: Set Up Structured Export with Cloud Functions

For more structured data, use a Cloud Function that processes Dialogflow CX interaction data and writes it to BigQuery in a clean schema.

This Cloud Function processes conversation data into a structured format:

```python
import functions_framework
from google.cloud import bigquery
import json
from datetime import datetime

# Initialize BigQuery client
bq_client = bigquery.Client()
TABLE_ID = "MY_PROJECT.dialogflow_analytics.conversations"

@functions_framework.cloud_event
def process_conversation_log(cloud_event):
    """Processes Dialogflow CX conversation logs and writes to BigQuery."""
    # Parse the Pub/Sub message containing the log entry
    data = json.loads(cloud_event.data["message"]["data"])

    # Extract conversation details from the log entry
    session_id = data.get("sessionInfo", {}).get("session", "").split("/")[-1]
    query_input = data.get("queryInput", {})
    query_result = data.get("queryResult", {})

    # Build the structured row
    row = {
        "session_id": session_id,
        "timestamp": datetime.utcnow().isoformat(),
        "user_input": extract_user_input(query_input),
        "detected_intent": query_result.get("intent", {}).get("displayName", ""),
        "intent_confidence": query_result.get("intentDetectionConfidence", 0),
        "matched_page": query_result.get("currentPage", {}).get("displayName", ""),
        "matched_flow": query_result.get("currentFlow", {}).get("displayName", ""),
        "agent_response": extract_agent_response(query_result),
        "parameters": json.dumps(query_result.get("parameters", {})),
        "webhook_called": bool(query_result.get("webhookPayloads")),
        "webhook_status": extract_webhook_status(query_result),
        "sentiment_score": query_result.get("sentimentAnalysisResult", {}).get("score", 0),
        "sentiment_magnitude": query_result.get("sentimentAnalysisResult", {}).get("magnitude", 0),
    }

    # Insert into BigQuery
    errors = bq_client.insert_rows_json(TABLE_ID, [row])
    if errors:
        print(f"BigQuery insert errors: {errors}")
    else:
        print(f"Logged conversation turn for session {session_id}")


def extract_user_input(query_input):
    """Extracts user input text from the query input."""
    if "text" in query_input:
        return query_input["text"].get("text", "")
    elif "intent" in query_input:
        return f"[Intent: {query_input['intent'].get('intent', '')}]"
    elif "dtmf" in query_input:
        return f"[DTMF: {query_input['dtmf'].get('digits', '')}]"
    return ""


def extract_agent_response(query_result):
    """Extracts the agent's text response from query result."""
    messages = query_result.get("responseMessages", [])
    texts = []
    for msg in messages:
        if "text" in msg:
            texts.extend(msg["text"].get("text", []))
    return " ".join(texts)


def extract_webhook_status(query_result):
    """Extracts webhook call status."""
    statuses = query_result.get("webhookStatuses", [])
    if statuses:
        return statuses[0].get("code", "unknown")
    return "none"
```

Create the BigQuery table with the matching schema:

```bash
# Create the structured conversations table
bq mk --table MY_PROJECT:dialogflow_analytics.conversations \
  session_id:STRING,\
  timestamp:TIMESTAMP,\
  user_input:STRING,\
  detected_intent:STRING,\
  intent_confidence:FLOAT,\
  matched_page:STRING,\
  matched_flow:STRING,\
  agent_response:STRING,\
  parameters:STRING,\
  webhook_called:BOOLEAN,\
  webhook_status:STRING,\
  sentiment_score:FLOAT,\
  sentiment_magnitude:FLOAT
```

## Step 4: Build a Session Summary Table

Individual turns are useful, but session-level summaries give you the big picture. Create a scheduled query that aggregates turns into sessions.

This scheduled query runs daily to create session summaries:

```sql
-- Create or replace the session summary table
CREATE OR REPLACE TABLE `MY_PROJECT.dialogflow_analytics.session_summaries` AS
SELECT
  session_id,
  MIN(timestamp) as session_start,
  MAX(timestamp) as session_end,
  TIMESTAMP_DIFF(MAX(timestamp), MIN(timestamp), SECOND) as duration_seconds,
  COUNT(*) as turn_count,

  -- First and last intents
  ARRAY_AGG(detected_intent ORDER BY timestamp ASC LIMIT 1)[SAFE_OFFSET(0)] as first_intent,
  ARRAY_AGG(detected_intent ORDER BY timestamp DESC LIMIT 1)[SAFE_OFFSET(0)] as last_intent,

  -- Distinct flows and pages visited
  ARRAY_LENGTH(ARRAY_AGG(DISTINCT matched_flow IGNORE NULLS)) as flows_visited,
  ARRAY_LENGTH(ARRAY_AGG(DISTINCT matched_page IGNORE NULLS)) as pages_visited,

  -- Webhook usage
  COUNTIF(webhook_called) as webhook_calls,
  COUNTIF(webhook_status != 'none' AND webhook_status != '0') as webhook_errors,

  -- Sentiment tracking
  AVG(sentiment_score) as avg_sentiment,
  MIN(sentiment_score) as min_sentiment,

  -- Resolution indicators
  LOGICAL_OR(detected_intent LIKE '%transfer%' OR detected_intent LIKE '%agent%') as transferred_to_agent,
  LOGICAL_OR(detected_intent LIKE '%resolved%' OR detected_intent LIKE '%thank%') as likely_resolved,

FROM `MY_PROJECT.dialogflow_analytics.conversations`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY session_id;
```

## Step 5: Write Analytics Queries

Now for the queries that drive real insights.

This query shows the most common reasons customers contact support:

```sql
-- Top contact reasons by first detected intent
SELECT
  first_intent as contact_reason,
  COUNT(*) as session_count,
  AVG(duration_seconds) as avg_duration_sec,
  AVG(turn_count) as avg_turns,
  COUNTIF(transferred_to_agent) as transfers,
  ROUND(COUNTIF(transferred_to_agent) / COUNT(*) * 100, 1) as transfer_rate_pct
FROM `MY_PROJECT.dialogflow_analytics.session_summaries`
WHERE session_start >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY first_intent
ORDER BY session_count DESC
LIMIT 20;
```

This query identifies intents with low confidence that might need more training phrases:

```sql
-- Intents with low detection confidence
SELECT
  detected_intent,
  COUNT(*) as occurrence_count,
  AVG(intent_confidence) as avg_confidence,
  MIN(intent_confidence) as min_confidence,
  COUNTIF(intent_confidence < 0.5) as low_confidence_count
FROM `MY_PROJECT.dialogflow_analytics.conversations`
WHERE
  timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND detected_intent != ''
GROUP BY detected_intent
HAVING avg_confidence < 0.7
ORDER BY occurrence_count DESC;
```

This query tracks containment rate over time:

```sql
-- Daily containment rate trend
SELECT
  DATE(session_start) as date,
  COUNT(*) as total_sessions,
  COUNTIF(NOT transferred_to_agent) as contained_sessions,
  ROUND(COUNTIF(NOT transferred_to_agent) / COUNT(*) * 100, 1) as containment_rate
FROM `MY_PROJECT.dialogflow_analytics.session_summaries`
WHERE session_start >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY date
ORDER BY date DESC;
```

This query finds conversation paths that lead to agent transfers:

```sql
-- Conversation paths that frequently lead to agent transfers
SELECT
  path,
  COUNT(*) as occurrence_count,
  ROUND(COUNT(*) / SUM(COUNT(*)) OVER() * 100, 1) as pct_of_transfers
FROM (
  SELECT
    session_id,
    STRING_AGG(matched_page, ' -> ' ORDER BY timestamp) as path
  FROM `MY_PROJECT.dialogflow_analytics.conversations`
  WHERE session_id IN (
    SELECT session_id FROM `MY_PROJECT.dialogflow_analytics.session_summaries`
    WHERE transferred_to_agent = TRUE
  )
  GROUP BY session_id
)
GROUP BY path
ORDER BY occurrence_count DESC
LIMIT 20;
```

## Step 6: Create a Monitoring Dashboard

Set up a Cloud Monitoring dashboard that tracks key metrics in real time:

```bash
# Create alert for high agent transfer rate
gcloud alpha monitoring policies create \
  --display-name="High Agent Transfer Rate" \
  --condition-display-name="Transfer rate above 40%" \
  --condition-filter='metric.type="custom.googleapis.com/dialogflow/transfer_rate"' \
  --condition-threshold-value=0.4 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=CHANNEL_ID \
  --combiner=OR
```

## Summary

Exporting Dialogflow CX conversation logs to BigQuery transforms your virtual agent from a black box into a data-driven system you can continuously improve. The key metrics to track are containment rate (what percentage of conversations the bot resolves without human help), intent confidence (are your training phrases covering what customers actually say), and conversation paths (where do customers get stuck or give up). Set up the log export pipeline, build session summaries, and review the analytics weekly to identify the highest-impact improvements for your agent.
