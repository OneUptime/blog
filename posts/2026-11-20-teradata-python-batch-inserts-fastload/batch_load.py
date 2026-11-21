from itertools import islice


def batches(rows, size):
    if size <= 0:
        raise ValueError('Batch size must be positive')
    source = iter(rows)
    while batch := list(islice(source, size)):
        yield batch


def load_sql_batches(connection, rows, size=10_000):
    """Own one transaction on a dedicated connection; caller closes it."""
    connection.autocommit = False
    submitted = 0
    try:
        with connection.cursor() as cursor:
            for batch in batches(rows, size):
                cursor.executemany(
                    'INSERT INTO lab.load_stage (row_id, payload) VALUES (?, ?)',
                    batch,
                )
                submitted += len(batch)
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    return submitted
