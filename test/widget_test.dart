import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yannotes/main.dart';

void main() {
  testWidgets('NotePage has a TextField', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());

    expect(find.byType(NotePage), findsOneWidget);

    expect(find.byType(TextField), findsOneWidget);

    expect(find.text('Start typing your note here...'), findsOneWidget);
  });
}
