import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:yannotes/providers/auth_provider.dart';
import 'package:yannotes/screens/login_screen.dart';

class Note {
  String title;
  String content;

  Note({required this.title, this.content = ''});
}

void main() {
  runApp(
    MultiProvider(
      providers: [ChangeNotifierProvider(create: (_) => AuthProvider())],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'YanNotes',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}

class NotePage extends StatefulWidget {
  const NotePage({super.key});

  @override
  State<NotePage> createState() => _NotePageState();
}

class _NotePageState extends State<NotePage> {
  final TextEditingController _textController = TextEditingController();
  final List<Note> _notes = [];
  int _selectedNoteIndex = -1;

  @override
  void initState() {
    super.initState();
    if (_notes.isEmpty) {
    } else {
      _selectNote(0, shouldPopDrawer: false);
    }
    _textController.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    if (_selectedNoteIndex >= 0 && _selectedNoteIndex < _notes.length) {
      _notes[_selectedNoteIndex].content = _textController.text;
    }
  }

  Future<void> _showTitleDialog({int? noteIndex}) async {
    final titleController = TextEditingController();
    bool isEditing = noteIndex != null;
    if (isEditing) {
      titleController.text = _notes[noteIndex].title;
    }

    final newTitle = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isEditing ? 'Edit Note Title' : 'New Note Title'),
        content: TextField(
          controller: titleController,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Enter title'),
          onSubmitted: (_) =>
              Navigator.of(context).pop(titleController.text.trim()),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              if (titleController.text.trim().isNotEmpty) {
                Navigator.of(context).pop(titleController.text.trim());
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (newTitle != null && newTitle.isNotEmpty) {
      setState(() {
        if (isEditing) {
          _notes[noteIndex].title = newTitle;
          // If the edited note is the currently selected one, update the AppBar title
          if (_selectedNoteIndex == noteIndex) {
            // This setState call will rebuild and pick up the new title
          }
        } else {
          final newNote = Note(title: newTitle);
          _notes.add(newNote);
          _selectedNoteIndex = _notes.length - 1;
          _textController.removeListener(_onTextChanged);
          _textController.text = newNote.content; // New note has empty content
          _textController.addListener(_onTextChanged);
        }
      });
    } else if (newTitle == null && !isEditing && _notes.isEmpty) {
      // If user cancelled creating the very first note, and no notes exist.
      // Optionally, create a default note or leave as is.
      // For now, we do nothing, user can try again.
    }
  }

  void _createNewNote() {
    _showTitleDialog();
  }

  void _editNoteTitle(int index) {
    _showTitleDialog(noteIndex: index);
  }

  void _selectNote(int index, {bool shouldPopDrawer = true}) {
    if (index >= 0 && index < _notes.length) {
      setState(() {
        _selectedNoteIndex = index;
        _textController.removeListener(_onTextChanged);
        _textController.text = _notes[index].content;
        _textController.addListener(_onTextChanged);
      });
      if (shouldPopDrawer && Navigator.canPop(context)) {
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, child) {
        String currentTitle;
        if (_selectedNoteIndex >= 0 && _selectedNoteIndex < _notes.length) {
          currentTitle = _notes[_selectedNoteIndex].title;
        } else if (auth.isAuthenticated) {
          currentTitle = auth.user?.username ?? 'YanNotes';
        } else {
          currentTitle = 'YanNotes';
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(currentTitle),
            backgroundColor: Theme.of(context).colorScheme.inversePrimary,
          ),
          drawer: Drawer(
            child: Column(
              children: [
                AppBar(
                  title: Text(
                    auth.isAuthenticated
                        ? 'Welcome, ${auth.user?.username}'
                        : 'All Notes',
                  ),
                  automaticallyImplyLeading: false,
                  backgroundColor: Theme.of(
                    context,
                  ).colorScheme.surfaceContainerHighest,
                ),
                Expanded(
                  child: ListView.builder(
                    itemCount: _notes.length,
                    itemBuilder: (context, index) {
                      return ListTile(
                        title: Text(_notes[index].title),
                        selected: index == _selectedNoteIndex,
                        selectedTileColor: Theme.of(
                          context,
                        ).colorScheme.primaryContainer.withOpacity(0.5),
                        onTap: () => _selectNote(index),
                        trailing: IconButton(
                          icon: const Icon(Icons.edit_outlined),
                          onPressed: () {
                            if (Navigator.canPop(context)) {
                              Navigator.pop(context);
                            }
                            _editNoteTitle(index);
                          },
                        ),
                      );
                    },
                  ),
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.add_circle_outline),
                  title: const Text('Create New Note'),
                  onTap: () {
                    if (Navigator.canPop(context)) {
                      Navigator.pop(context);
                    }
                    _createNewNote();
                  },
                ),
                if (auth.isAuthenticated)
                  ListTile(
                    leading: const Icon(Icons.logout),
                    title: const Text('Logout'),
                    onTap: () {
                      Navigator.pop(context);
                      auth.logoutUser();
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const LoginScreen(),
                        ),
                      );
                    },
                  )
                else
                  ListTile(
                    leading: const Icon(Icons.login),
                    title: const Text('Login'),
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const LoginScreen(),
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
          body: (_selectedNoteIndex == -1 || _notes.isEmpty)
              ? Center(
                  child: _notes.isEmpty
                      ? const Text('Create a new note to begin.')
                      : const Text('Select a note to view or edit.'),
                )
              : TextField(
                  controller: _textController,
                  maxLines: null,
                  expands: true,
                  textAlignVertical: TextAlignVertical.top,
                  decoration: const InputDecoration(
                    hintText: 'Start typing your note here...',
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.all(16.0),
                  ),
                ),
        );
      },
    );
  }

  @override
  void dispose() {
    _textController.removeListener(_onTextChanged);
    _textController.dispose();
    super.dispose();
  }
}
