Set WshShell = CreateObject("WScript.Shell")
Set Fso = CreateObject("Scripting.FileSystemObject")
scriptDir = Fso.GetParentFolderName(WScript.ScriptFullName)
cmdPath = Fso.BuildPath(scriptDir, "start-notifier.cmd")
WshShell.Run Chr(34) & cmdPath & Chr(34), 0, False
