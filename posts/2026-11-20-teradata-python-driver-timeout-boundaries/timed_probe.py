import time


def timed(stage, operation):
    started = time.perf_counter()
    outcome = 'error'
    try:
        result = operation()
        outcome = 'ok'
        return result
    finally:
        print(f'{stage}: {outcome}, {time.perf_counter() - started:.3f}s')


def probe(connection):
    with connection.cursor() as cursor:
        timed('execute', lambda: cursor.execute(
            '{fn teradata_request_timeout(15)}SELECT CURRENT_TIMESTAMP'
        ))
        timed('fetch', cursor.fetchone)
