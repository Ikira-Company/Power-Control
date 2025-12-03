!macro customInstall
  ; Добавляем в автозагрузку
  CreateShortCut "$SMSTARTUP\PowerControl.lnk" "$INSTDIR\PowerControl.exe"
!macroend

; === Create custom_theme folder in userData ===
Section -Post
    ; путь к AppData\<ProductName>
    StrCpy $0 "$APPDATA\${PRODUCT_NAME}"

    ; создаём папку custom_theme
    CreateDirectory "$0\custom_theme"
SectionEnd
