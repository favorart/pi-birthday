#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import io
import re
import sys
import csv
import arrow
import random
import bisect
import threading
import Tkinter as tk

try:
    import tkinter as tk    # >= python 3.0
except ImportError:
    import Tkinter as tk    # >= python 2.7
import tkFont

LOCAL_STRINGS = {} # перевод программы на разные языки
FN_PI_STRING = '' # имя файла с предпосчитанными 3 млрд. знаками числа Пи
FN_LOG_DATES = ''
FN_DB_DATES = '' # имя файла БД с расположением дат в строке Пи
LONG_ARRAY = '' # массив для сохранения подстроки Пи, которая отображена в окне
DB = {} # словарь БД дат-смещений

class Worker(threading.Thread):
    ''' thread to read the dates DB from the text file '''
    def run(self):
        global DB
        DB = read_db()
WORKER = Worker()

class DateEntry(tk.Frame):
    ''' Entry to input validated date only '''
    def __init__(self, master, frame_look={}, **look):
        args = dict(relief=tk.SUNKEN, border=1)
        args.update(frame_look)
        tk.Frame.__init__(self, master, **args)
        args = {'relief': tk.FLAT}
        args.update(look)
        vcmd = (self.register(self.onValidate), '%P')
        self.entry = tk.Entry(self, validate="key", validatecommand=vcmd,  **args)
        self.entry.pack(side=tk.TOP, fill=tk.X)
    
    def get(self):
        return self.entry.get()
    
    def onValidate(self, P):
        if (len(P) > 10):
            self.bell()
            return False
        if (len(P) == 1 and P[0] not in '0123'):
            self.bell()
            return False
        if (len(P) > 1 and (not P[1].isdigit() or \
            (P[0] == P[1] and P[1] == '0') or int(P[:2]) > 31)):
            self.bell()
            return False
        if (len(P) > 2 and P[2] != '.'):
            self.bell()
            return False
        if (len(P) > 3 and P[3] not in '01'):
            self.bell()
            return False
        if (len(P) > 4):
            if (not P[4].isdigit() or (P[3] == P[4] and P[4] == '0') or int(P[3:5]) > 12):
                self.bell()
                return False
            if (int(P[:2]) > 29 and P[3:5] == '02'):
                self.bell()
                return False
            if (int(P[:2]) == 31 and P[3:5] in ['04', '06', '09', '11']):
                self.bell()
                return False        
        if (len(P) > 5 and P[5] != '.'):
            self.bell()
            return False
        if (len(P) > 6 and not P[6:].isdigit()):
            self.bell()
            return False
        if (len(P) == 10):
            try:
                splt = P.split('.')
                valid = arrow.Arrow(int(splt[2]),int(splt[1]),int(splt[0]))
            except ValueError:
                self.bell()
                return False
        return True

class KeyList(object):
    ''' bisect doesn't accept a key function, so we build the key into our sequence '''
    def __init__(self, l, key):
        self.l = l
        self.key = key
    def __len__(self):
        return len(self.l)
    def __getitem__(self, index):
        return self.key(self.l[index], index)

class WrappingLabel(tk.Text):
    ''' a type of Text that automatically adjusts the wrap to the size '''
    def __init__(self, master=None, **kwargs):
        tk.Text.__init__(self, master, **kwargs)
        self.bind('<Configure>', self.onFit)
        self.font = tkFont.nametofont(self["font"])
        self.font_height = 46.8 # self.font.metrics('linespace')
    
    def onFit(self, event):
        global LONG_ARRAY, lb_first_text, lb_last_no_text, lb_found_no_text
        max_width = event.width
        max_height = event.height / self.font_height # rough n_lines
        text = LONG_ARRAY
        last = int(lb_last_no_text.get())
        first = int(lb_first_text.get())-1
        actual_width = self.font.measure(text)
        if (actual_width  > max_width * max_height):
            # the original text won't fit. Keep shrinking until it does
            ilast = bisect.bisect_left(KeyList(text, key=lambda x,i: 
                                               self.font.measure(text[:i]+ '...')), 
                                               max_width * max_height)
            last = (first + ilast) if (ilast > 0) else last
            text = text[:last-first] + '...'
        self.config(state=tk.NORMAL)
        self.delete(1.0, tk.END)
        self.insert(tk.END, text)
        if (lb_found_no_text.get().isdigit()):
            index = (int(lb_found_no_text.get()) - first - 1)
            self.tag_delete("highlight")
            self.tag_add("highlight", "1."+str(index), "1."+str(index+8))
            self.tag_config("highlight", background=frame["bg"], foreground="red")
        self.config(state=tk.DISABLED)
        lb_last_no_text.set(str(last))
        return True

def bt_find_click(event=None):
    global LONG_ARRAY, FN_LOG_DATES, DB
    global lb_first_text, lb_last_no_text, lb_found_no_text, lb3
    first, last = 1, 2500
    if WORKER.is_alive():
        WORKER.join()
    ddate = tb_date.get()
    if (not DB.has_key(ddate)):
        lb_found_no_text.set("--")
    else:
        index = int(DB[ddate])
        with open(FN_LOG_DATES, 'a') as f_log:
            print >>f_log, ddate
        last = int(lb_last_no_text.get()) - int(lb_first_text.get())
        last_of = random.randint(9, 100) if (last > 100) else 9
        offset = random.randint(10, last - last_of)
        first = (index - offset) if (index > offset) else 1
        last = index + last
        lb_found_no_text.set(str(index))
    lb_first_text.set(str(first))
    lb_last_no_text.set(str(last))
    LONG_ARRAY = read_pi(first,last-first)
    lb3.config(state=tk.NORMAL)
    lb3.event_generate("<Configure>", when="now",
                       width=lb3.winfo_width(), height=lb3.winfo_height())
    lb3.config(state=tk.DISABLED)
    return

def read_pi(first,last):
    global FN_PI_STRING
    with open(FN_PI_STRING, 'r') as f_pi:
        if (first == 1):
            f_pi.seek(1)
            PI = "3."+f_pi.read(last)
        else:
            f_pi.seek(first)
            PI = f_pi.read(last)
    return PI

def read_config():
    global FN_LOG_DATES, FN_PI_STRING, FN_DB_DATES, LOCAL_STRINGS
    with open('config.txt', 'r') as f:
        config = { line.split('=')[0].strip():
                   line.split('=')[1].strip().strip('"') for line in f }
    FN_LANGUAGE = os.path.join(config["lang_dir"],config["language"])
    FN_LOG_DATES = config["log_dates"]
    FN_PI_STRING = config["pi_string"]
    FN_DB_DATES = config["db_file"]
    with io.open(FN_LANGUAGE, 'r', encoding='utf-8') as f:
        LOCAL_STRINGS = { line.split('=')[0].strip():
                          line.split('=')[1].strip().strip('"') for line in f }
    return

def read_db():
    global FN_DB_DATES
    with open(FN_DB_DATES, mode='r') as infile:
        db = dict(row[:2] for row in csv.reader(infile, delimiter="\t"))
    return db

def listen_for_result():
    ''' Check if there is something load '''
    global WORKER, root
    WORKER.join(1)
    if WORKER.is_alive():
        root.after(10, listen_for_result)

if __name__ == '__main__':
    read_config()
    LONG_ARRAY = read_pi(1,2500)
    root = tk.Tk()
    root.geometry("1280x640")
    root.minsize(680, 340)
    WORKER.start()
    root.after(10, listen_for_result)
    root.bind('<Return>', bt_find_click)
    dFont=tkFont.Font(family="Arial", size=30)
    root.grid_columnconfigure(0, weight=1)
    frame = tk.Frame(root)
    tk.Grid.rowconfigure(root, 0, weight=1)
    tk.Grid.columnconfigure(root, 0, weight=1)
    frame.grid(row=0, column=0, sticky=tk.NSEW)
    lb_invite = tk.Label(frame, text=LOCAL_STRINGS["invitation"], font=dFont, anchor=tk.NW)
    lb_invite.grid(column=0, row=0, columnspan=4, sticky=tk.NSEW, pady=0, padx=10)
    tb_date = DateEntry(frame, font=dFont)
    tb_date.grid(column=4, row=0, columnspan=3, sticky=tk.NSEW, pady=10)
    tb_date.bind('<Return>', bt_find_click)
    bt_find = tk.Button(frame, text=LOCAL_STRINGS["button_name"], font=dFont,
                        command=bt_find_click)
    bt_find.grid(column=8, row=0, columnspan=2, sticky=tk.NSEW, pady=0)
    lb_first1 = tk.Label(frame, text=LOCAL_STRINGS["lb1"], font=dFont, anchor=tk.SW)
    lb_first1.grid(column=0, row=1, sticky=tk.NSEW)
    lb_first_text = tk.StringVar()
    lb_first_text.set("1")
    lb_first = tk.Label(frame, textvariable=lb_first_text, width=10, font=dFont, anchor=tk.NW)
    lb_first.grid(column=0, row=2, sticky=tk.NSEW)
    lb_found1 = tk.Label(frame, text=LOCAL_STRINGS["lb2"], font=dFont, anchor=tk.SW)
    lb_found1.grid(column=0, row=3, sticky=tk.NSEW)
    lb_found_no_text = tk.StringVar()
    lb_found_no_text.set("--")
    lb_found_no = tk.Label(frame, textvariable=lb_found_no_text, font=dFont, anchor=tk.NW)
    lb_found_no.grid(column=0, row=4, sticky=tk.NSEW)
    lb_last1 = tk.Label(frame, text=LOCAL_STRINGS["lb3"], font=dFont, anchor=tk.SW)
    lb_last1.grid(column=0, row=5, sticky=tk.NSEW)
    lb_last_no_text = tk.StringVar()
    lb_last_no_text.set("2500")
    lb_last_no = tk.Label(frame, textvariable=lb_last_no_text, font=dFont, anchor=tk.NW)
    lb_last_no.grid(column=0, row=6, sticky=tk.NSEW)
    lb_last_digit_text = tk.StringVar()
    lb_last_digit_text.set("")
    lb_last_digit = tk.Label(frame, textvariable=lb_last_digit_text, font=dFont, anchor=tk.NW)
    lb_last_digit.grid(column=1, row=6, columnspan=9, rowspan=1, sticky=tk.NSEW)  
    lb3_text = tk.StringVar() 
    lb3 = WrappingLabel(frame, font=dFont, wrap=tk.CHAR, bg=frame["bg"], fg='black')
    lb3.grid(column=1, row=1, columnspan=9, rowspan=5, sticky=tk.NSEW)
    for y in range(1,11):
        tk.Grid.columnconfigure(frame, y, weight=1)
    for x in range(2,6):
        tk.Grid.rowconfigure(frame, x, weight=1)
    lb3.insert(tk.END, LONG_ARRAY)
    lb3.config(state=tk.DISABLED)
    tb_date.focus_set()
    root.mainloop()
