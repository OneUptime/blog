"""YDB Python SDK 3.35.0; caller owns an authenticated QuerySessionPool."""
import ydb

READ = """
DECLARE $request_id AS Utf8;
SELECT payload FROM retry_requests WHERE request_id = $request_id;
"""
INSERT = """
DECLARE $request_id AS Utf8;
DECLARE $payload AS Utf8;
INSERT INTO retry_requests (request_id, payload)
VALUES ($request_id, $payload);
"""


def record_request(pool, request_id, payload):
    if not request_id or not isinstance(payload, str):
        raise ValueError("Supply a stable nonempty request ID and a string payload")
    parameters = {"$request_id": (request_id, ydb.PrimitiveType.Utf8)}

    def attempt(session):
        with session.transaction(ydb.QuerySerializableReadWrite()) as tx:
            result_sets = list(tx.execute(READ, parameters))
            rows = [row for result in result_sets for row in result.rows]
            if rows:
                if rows[0].payload != payload:
                    raise ValueError("Request ID was already used with another payload")
                tx.commit()
                return request_id
            write_parameters = dict(parameters)
            write_parameters["$payload"] = (payload, ydb.PrimitiveType.Utf8)
            list(tx.execute(INSERT, write_parameters, commit_tx=True))
            return request_id

    return pool.retry_operation_sync(
        attempt,
        retry_settings=ydb.RetrySettings(
            max_retries=3,
            max_session_acquire_timeout=5,
            idempotent=True,
        ),
    )
