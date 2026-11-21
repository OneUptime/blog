SELECT DatabaseName, AccountName, Vproc,
       CurrentSpool, PeakSpool, MaxSpool, MaxProfileSpool
FROM DBC.DiskSpaceV
WHERE DatabaseName = 'REPLACE_WITH_LOGON_USER'
ORDER BY CurrentSpool DESC, Vproc;

SELECT AccountName,
       SUM(CAST(CurrentSpool AS DECIMAL(38,0))) AS CurrentSpoolBytes,
       MAX(CurrentSpool) AS BusiestAmpBytes,
       AVG(CAST(CurrentSpool AS FLOAT)) AS AverageAmpBytes,
       MAX(CAST(CurrentSpool AS FLOAT)) /
           NULLIF(AVG(CAST(CurrentSpool AS FLOAT)), 0) AS MaxToAverage
FROM DBC.DiskSpaceV
WHERE DatabaseName = 'REPLACE_WITH_LOGON_USER'
GROUP BY AccountName;
