# Validation Summary: How to Use QuickSight Q for Natural Language Queries

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon QuickSight Q / Amazon Q in QuickSight topics
- AWS CLI for QuickSight topic management
- Boto3 QuickSight embedding API
- Amazon QuickSight Embedding SDK for JavaScript

## Sources Consulted
- AWS CLI Command Reference: `quicksight create-topic` - https://docs.aws.amazon.com/cli/latest/reference/quicksight/create-topic.html
- AWS CLI Command Reference: `quicksight update-topic` - https://docs.aws.amazon.com/cli/latest/reference/quicksight/update-topic.html
- Amazon QuickSight API Reference: `CreateTopic` - https://docs.aws.amazon.com/quicksight/latest/APIReference/API_CreateTopic.html
- Amazon QuickSight User Guide: refreshing datasets in a QuickSight topic - https://docs.aws.amazon.com/quick/latest/userguide/topics-data-refresh.html
- Amazon QuickSight User Guide: embedding the Q search bar for registered users - https://docs.aws.amazon.com/quick/latest/userguide/embedded-analytics-q-search-bar-for-authenticated-users.html
- Amazon QuickSight User Guide: using Topics on sheets - https://docs.aws.amazon.com/quick/latest/userguide/using-q-topics-on-sheets.html
- Amazon QuickSight User Guide: Answering business questions with Amazon QuickSight Q - https://docs.aws.amazon.com/quicksight/latest/user/working-with-quicksight-q.html

## Issues Found
- The prerequisites incorrectly said QuickSight Q requires a SPICE dataset and does not work with direct query mode. AWS documentation now describes topic refresh handling for both SPICE and direct query datasets, so the text was updated to say topics can use either mode and direct query datasets need a topic refresh schedule.
- The `create-topic` and `update-topic` examples used `DefaultAggregation`, which is not a valid field in the QuickSight topic API schema. Replaced it with `Aggregation` for columns and calculated fields.
- The named entity example used invalid `PropertyRole` values (`PRIMARY_KEY` and `MEASURE`) and omitted required/expected property details. Updated it to use `PropertyRole: "PRIMARY"` for the product dimension and `PropertyUsage: "MEASURE"` with a metric aggregation for revenue.
- The JavaScript embedding example mixed the current SDK v2 embedding context with the old `.on(...)` event style. Updated it to pass `frameOptions` and `contentOptions` to `embedQSearchBar`, with Q search events handled in `onMessage`.
- The user-access comments described QuickSight Q as a separately enabled add-on for specific users. Updated the comments to the current access model: users need an appropriate QuickSight role/access and the topic or dashboard must be shared with them.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI validation was performed against the official AWS CLI and API references rather than local `aws --help` output. The corrected topic JSON snippets were parsed locally to verify valid JSON structure.
