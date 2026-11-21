SELECT Vproc, CurrentPerm
FROM DBC.TableSizeV
WHERE DatabaseName = 'REPLACE_WITH_DATABASE'
  AND TableName = 'REPLACE_WITH_TABLE'
ORDER BY CurrentPerm DESC, Vproc;

SELECT customer_id, COUNT(*) AS RowsForValue
FROM lab.orders_slice
GROUP BY customer_id
ORDER BY RowsForValue DESC;

SELECT HASHAMP(
           HASHBUCKET(HASHROW(customer_id))
           MAP = REPLACE_WITH_CONTIGUOUS_MAP
       ) AS CandidateAmp,
       COUNT(*) AS CandidateRows
FROM lab.orders_slice
GROUP BY 1
ORDER BY CandidateRows DESC;
