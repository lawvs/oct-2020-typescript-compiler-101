import {
    BinaryExpression,
    isBinaryExpression,
    isNumericLiteral,
    isParenthesizedExpression,
    Node,
    NumericLiteral,
    SourceFile,
    SyntaxKind,
    TransformerFactory,
    visitEachChild,
    VisitResult,
} from 'typescript'

const op: Record<number, (a: number, b: number) => number> = {
    [SyntaxKind.PlusToken]: (a: number, b: number) => a + b,
    [SyntaxKind.MinusToken]: (a: number, b: number) => a - b,
    [SyntaxKind.AsteriskToken]: (a: number, b: number) => a * b,
    [SyntaxKind.SlashToken]: (a: number, b: number) => a / b,
}

export default function (): TransformerFactory<SourceFile> {
    return (context) => {
        return (sourceFile) => {
            const { factory } = context

            function visitBinaryExpression(node: BinaryExpression): NumericLiteral | BinaryExpression {
                let { left, right, operatorToken } = node
                // (1 + 1)
                if (isParenthesizedExpression(left)) {
                    left = left.expression
                }
                if (isParenthesizedExpression(right)) {
                    right = right.expression
                }
                if (isBinaryExpression(left)) {
                    left = visitBinaryExpression(left)
                }
                if (isBinaryExpression(right)) {
                    right = visitBinaryExpression(right)
                }

                if (isNumericLiteral(left) && isNumericLiteral(right)) {
                    const calcFn = op[operatorToken.kind]
                    if (calcFn) {
                        return factory.createNumericLiteral(calcFn(parseFloat(left.text), parseFloat(right.text)))
                    }
                }
                return node
            }

            function visit<T extends Node>(node: T): VisitResult<Node> {
                // constant folding
                if (isBinaryExpression(node)) {
                    return visitBinaryExpression(node)
                }
                return visitEachChild(node, visit, context)
            }
            return visitEachChild(sourceFile, visit, context)
        }
    }
}
