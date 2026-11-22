"""YDB SDK3.35.0; caller owns an authenticated QuerySessionPool."""
import ydb


def execute_once(pool, query, parameters=None):
    with pool.checkout(timeout=1) as session:
        with session.transaction(ydb.QuerySerializableReadWrite()) as tx:
            return list(tx.execute(
                query,
                parameters=parameters,
                commit_tx=True,
                settings=ydb.BaseRequestSettings().with_timeout(3),
            ))
