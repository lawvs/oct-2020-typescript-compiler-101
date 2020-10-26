import ts, {
    isEmptyStatement,
    isFunctionDeclaration,
    isLiteralTypeNode,
    isToken,
    isTypeReferenceNode,
    isUnionTypeNode,
    Node,
    ParameterDeclaration,
    SourceFile,
    Statement,
    SyntaxKind,
    TransformerFactory,
    visitEachChild,
    VisitResult,
} from 'typescript'

function isPrimitive(type: string) {
    return ['string', 'bigint', 'boolean', 'symbol', 'undefined', 'number'].includes(type)
}

export default function (): TransformerFactory<SourceFile> {
    return (context) => {
        return (sourceFile) => {
            const { factory } = context

            function createThrowTypeError(name: string, expectedType: string) {
                return factory.createThrowStatement(
                    factory.createNewExpression(factory.createIdentifier('TypeError'), undefined, [
                        factory.createStringLiteral(name + ' is not type ' + expectedType),
                    ])
                )
            }

            function createTypeCheckStatement(param: ParameterDeclaration): Statement {
                const { name, type } = param
                if (!type) {
                    return factory.createEmptyStatement()
                }
                if (isUnionTypeNode(type)) {
                    // TODO handle union type
                }
                if (isToken(type)) {
                    const typeName = type.getText()
                    // typeof x != "number"
                    return factory.createIfStatement(
                        factory.createBinaryExpression(
                            factory.createTypeOfExpression(factory.createIdentifier(name.getText())),
                            factory.createToken(SyntaxKind.ExclamationEqualsToken),
                            factory.createStringLiteral(typeName)
                        ),
                        createThrowTypeError(name.getText(), typeName)
                    )
                }

                if (isLiteralTypeNode(type)) {
                    // NullLiteral | BooleanLiteral | LiteralExpression | PrefixUnaryExpression

                    if (type.literal.kind === SyntaxKind.NullKeyword) {
                        // x != null
                        return factory.createIfStatement(
                            factory.createBinaryExpression(
                                factory.createIdentifier(name.getText()),
                                factory.createToken(SyntaxKind.ExclamationEqualsToken),
                                factory.createNull()
                            ),
                            createThrowTypeError(name.getText(), type.getText())
                        )
                    }
                    // TODO other literal
                }

                if (isTypeReferenceNode(type)) {
                    const typeName = type.getText()
                    return factory.createIfStatement(
                        factory.createPrefixUnaryExpression(
                            SyntaxKind.ExclamationToken,
                            factory.createParenthesizedExpression(
                                factory.createBinaryExpression(
                                    factory.createIdentifier(name.getText()),
                                    factory.createToken(SyntaxKind.InstanceOfKeyword),
                                    factory.createIdentifier(typeName)
                                )
                            )
                        ),
                        createThrowTypeError(name.getText(), typeName)
                    )
                }

                return factory.createEmptyStatement()
            }

            function visit<T extends Node>(node: T): VisitResult<Node> {
                if (isFunctionDeclaration(node)) {
                    if (!node.parameters.length) {
                        return node
                    }
                    const checkStatements = node.parameters
                        .map((parameter) => createTypeCheckStatement(parameter))
                        .filter((statement) => !isEmptyStatement(statement))

                    return factory.createFunctionDeclaration(
                        node.decorators,
                        node.modifiers,
                        node.asteriskToken,
                        node.name,
                        node.typeParameters,
                        node.parameters,
                        node.type,
                        factory.createBlock([...checkStatements, ...(node.body?.statements ?? [])])
                    )
                }
                return visitEachChild(node, visit, context)
            }
            return visitEachChild(sourceFile, visit, context)
        }
    }
}
