filepath = "Z:\Giobby\Export\_LOGS\logs.txt"

Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objFile = objFSO.OpenTextFile(filepath, 8, True)

delayTime = 1000

objFile.WriteLine Now & " - FATTURE import start"

' Open Excel application
Set objExcel = CreateObject("Excel.Application")
objExcel.Visible = True ' Set to False to run in the background

' Open DB.xlsx
Set objWorkbook_DB = objExcel.Workbooks.Open("Z:\Giobby\Export\DB.xlsx")
Set ws_DB = objWorkbook_DB.Sheets(4) ' Select Sheet 4 - Fatture

' Find the last used row in column A of DB.xlsx
last_ID = ws_DB.Cells(2,1).Value

' File Closed. Last reference saved

' =========================================================

Set objWorkbook = objExcel.Workbooks.Open("Z:\Giobby\Export\Fatture\DB_FATTURE.xlsx")
Set ws = objWorkbook.Sheets(1) ' Select Sheet 1


' Insert new column at position C for "Kreacasa/Radaway"
ws.Columns(3).Insert -4161 ' xlToRight equivalent
ws.Cells(1, 3).Value = "Kreacasa/Radaway" ' Set header

' Insert column for shipping costs in column F (6)
ws.Columns(6).Insert -4161
ws.Cells(1, 6).Value = "Spese Spedizione"

' Ensure column 11 is formatted as Date
ws.Columns(11).NumberFormat = "DD/MM/YYYY"

' Insert new columns L, M, N (12, 13, 14)
ws.Columns(12).Insert -4161
ws.Columns(13).Insert -4161
ws.Columns(14).Insert -4161

ws.Cells(1, 12).Value = "ANNO"
ws.Cells(1, 13).Value = "MESE"
ws.Cells(1, 14).Value = "SETTIMANA"

ws.Columns(12).NumberFormat = "@"
ws.Columns(13).NumberFormat = "@"
ws.Columns(14).NumberFormat = "@"

' Loop through column A to find the row with the last_ID
lastUsedRow = 0 ' Initialize variable to store the row number
For i = 1 To ws.Cells(ws.Rows.Count, 1).End(-4162).Row ' xlUp equivalent
    If ws.Cells(i, 1).Value = last_ID Then
        lastUsedRow = i
        Exit For
    End If
Next

lastUsedRow = lastUsedRow-1 ' Do not consider the match row

amountElements = lastUsedRow-1
'MsgBox "Imported " & amountElements & " elements"

' Loop through all rows to define Kreacasa/Radaway in col C (3) from row 2 to lastUsedRow
For i = 2 To lastUsedRow

    ' Set RADAWAY or KREACASA
    If InStr(1, ws.Cells(i, 2).Value, "R1", 1) > 0 Then
        ws.Cells(i, 3).Value = "RADAWAY"
    Else
        ws.Cells(i, 3).Value = "KREACASA"
    End If

    ' Loop through all IDs to get shipping costs and update date values
    id = ws.Cells(i, 1).Value
    
    If IsDate(ws.Cells(i, 11).Value) Then ' Date in col J
        documentDate = ws.Cells(i, 11).Value
        ws.Cells(i, 12).Value = Year(documentDate) ' ANNO
        ws.Cells(i, 13).Value = Left(MonthName(Month(documentDate)), 3) ' MESE
        ws.Cells(i, 14).Value = objExcel.WorksheetFunction.ISOWeekNum(documentDate) & "-" & Year(documentDate) ' SETTIMANA
    Else
        ws.Cells(i, 12).Value = "Invalid Date"
        ws.Cells(i, 13).Value = "Invalid Date"
        ws.Cells(i, 14).Value = "Invalid Date"
    End If

    ' API call for shipping costs
    If id <> "" Then
        url = "http://192.168.100.170:3000/invoice/" & id & "/costoSpedizione"

        ' Create HTTP request
        Set objHTTP = CreateObject("MSXML2.XMLHTTP")
        objHTTP.Open "GET", url, False
        objHTTP.Send

        ' Check response
        If objHTTP.Status = 200 Then
            response = objHTTP.responseText
            ws.Cells(i, 6).Value = response ' Store in "Spese Spedizione" column
        Else
            ws.Cells(i, 6).Value = "Error"
        End If

        WScript.Sleep delayTime ' Introduce a delay to prevent Excel from crashing
    End If

    ' Subtract Spese Spedizione from Imponibile
    If IsNumeric(ws.Cells(i, 5).Value) And IsNumeric(ws.Cells(i, 6).Value) Then
        imponibile = ws.Cells(i, 5).Value
        speseSpedizione = ws.Cells(i, 6).Value
        ws.Cells(i, 5).Value = imponibile - speseSpedizione
    End If
Next

' =========================================================

' Now copy the range from row 2 to lastUsedRow in DB.xlsx (objWorkbook_DB), Sheet 2

' Insert empty rows in DB.xlsx to shift down existing data
ws_DB.Rows("2:" & lastUsedRow).Insert -4162 ' xlDown equivalent
'MsgBox amountElements & " rows created"

' Remove bold formatting
ws_DB.Rows("2:" & 2 + amountElements - 1).Font.Bold = False

' Copy manipulated data(rows 2 to lastRow)
ws.Range("A2:Z" & lastUsedRow).Copy

' Paste values into DB.xlsx starting at row 2
ws_DB.Range("A2").PasteSpecial -4163 ' xlPasteValues equivalent

'MsgBox amountElements & " elements pasted in DB"
objFile.WriteLine Now & " - FATTURE " & amountElements & " elements pasted in DB"

' Clear clipboard
objExcel.CutCopyMode = False

' Save and close DB_FATTURE.xlsx after manipulation
objWorkbook.Save
objWorkbook.Close False

' Save and close DB.xlsx
objWorkbook_DB.Save
objWorkbook_DB.Close False

' Quit Excel
objExcel.Quit

' Cleanup
Set objHTTP = Nothing
Set ws = Nothing
Set ws_DB = Nothing
Set objWorkbook = Nothing
Set objWorkbook_DB = Nothing
Set objExcel = Nothing

' Log the update
objFile.WriteLine Now & " - FATTURE import completed"

objFile.Close
Set objFile = Nothing
Set objFSO = Nothing
