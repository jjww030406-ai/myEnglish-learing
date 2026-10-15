@echo off
chcp 65001 > nul
echo.
echo 正在打开英语学习网站...
start "" "%~dp0index.html"
echo.
echo 已打开。如果没反应，请手动双击 index.html 文件。
echo 使用完直接关闭这个窗口即可。
timeout /t 3 > nul