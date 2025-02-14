Attribute VB_Name = "Module1"
Sub UpdateShippingCost()
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim i As Long
    Dim orderID As String
    Dim url As String
    Dim http As Object
    Dim response As String

    ' Set active worksheet
    Set ws = ActiveSheet

    ' Find last row with data in column B
    lastRow = ws.Cells(ws.Rows.Count, 2).End(xlUp).Row

    ' Loop from bottom to top to avoid skipping rows when deleting
    For i = lastRow To 2 Step -1
        If InStr(1, ws.Cells(i, 2).Value, "R1", vbTextCompare) = 0 Then
            ws.Rows(i).Delete
        End If
    Next i

    ' Insert column for shipping costs in the 5th position if not already present
    ws.Columns(5).Insert Shift:=xlToRight, CopyOrigin:=xlFormatFromLeftOrAbove
    ws.Cells(1, 5).Value = "Spese Spedizione" ' Set header for column E

    ' Find last row again after deletion
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row

    ' Loop through all order IDs
    For i = 2 To lastRow ' Assuming first row is headers
        orderID = ws.Cells(i, 1).Value  ' Get order ID

        If orderID <> "" Then
            ' Construct API URL
            url = "http://localhost:3000/order/" & orderID & "/costoSpedizione"
            
            ' Create HTTP request
            Set http = CreateObject("MSXML2.XMLHTTP")
            http.Open "GET", url, False
            http.Send
            
            ' Check response
            If http.Status = 200 Then
                response = http.responseText  ' Get API response (cost)
                ws.Cells(i, 5).Value = response  ' Store in "Spese Spedizione" column
            Else
                ws.Cells(i, 5).Value = "Error"  ' Mark as error
            End If

            ' Clean up object
            Set http = Nothing
        End If
    Next i

    MsgBox "Shipping costs updated!", vbInformation, "Update Complete"
End Sub

