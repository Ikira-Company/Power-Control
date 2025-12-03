import sys
import os
import platform

def shutdown():
    plat = platform.system()
    if plat == "Windows":
        os.system("shutdown /s /t 0")
    elif plat == "Linux":
        os.system("systemctl poweroff")
    elif plat == "Darwin":
        os.system('osascript -e \'tell app "System Events" to shut down\'')

def restart():
    plat = platform.system()
    if plat == "Windows":
        os.system("shutdown /r /t 0")
    elif plat == "Linux":
        os.system("systemctl reboot")
    elif plat == "Darwin":
        os.system('osascript -e \'tell app "System Events" to restart\'')

def sleep():
    plat = platform.system()
    if plat == "Windows":
        os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")
    elif plat == "Linux":
        os.system("systemctl suspend")
    elif plat == "Darwin":
        os.system('osascript -e \'tell app "System Events" to sleep\'')

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python power_actions.py [shutdown|restart|sleep]")
        sys.exit(1)

    action = sys.argv[1].lower()
    if action == "shutdown":
        shutdown()
    elif action == "restart":
        restart()
    elif action == "sleep":
        sleep()
    else:
        print("Unknown action:", action)
