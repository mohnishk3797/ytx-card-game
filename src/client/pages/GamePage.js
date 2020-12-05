import React, { useContext, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GAME_CONFIG from '../../../GAME_CONFIG.json';
import { Board, BoardCard } from '../components';
import { store } from '../store/Store'
const HAND_SIZE = GAME_CONFIG.maxCardsInHand
const FIELD_SIZE = GAME_CONFIG.maxCardsInField
const MIN_CARD_LIFE = GAME_CONFIG.minCardLife
const MAX_CARD_LIFE = GAME_CONFIG.maxCardLife
const MAX_CARD_ATTACK = GAME_CONFIG.maxCardAttack
const MIN_CARD_ATTACK = GAME_CONFIG.minCardAttack
const SECONDS_PER_TURN = GAME_CONFIG.secondsPerTurn
const CARD_TYPES = ['fire', 'water', 'wind', 'life', 'death', 'neutral']

export default () => {
	const { state, dispatch } = useContext(store)
	const [gameOver, setGameOver] = useState(null)
	const [turnCountdownTimer, setTurnCountdownTimer] = useState(
		SECONDS_PER_TURN,
	)
	const isGamePaused = () => state.game && state.game.gamePaused

	useEffect(() => {
		if (state.playerNumber === 2) {
			dispatch({
				type: 'SET_IS_OTHER_PLAYER_TURN',
				payload: {
					isOtherPlayerTurn: true,
				},
			})
		}
		setListeners()
	}, [])

	/**
	 * @dev On render and new-turn a timer will countdown how long left the player has to make a move
	 */
	useEffect(() => {
		const countdownTimer = setTimeout(() => {
			if (isGamePaused()) return

			const turnTimeLimit = new Date(
				state.game.currentTurnTimeLimitTimestamp,
			)

			if (turnCountdownTimer <= 0 && !state.isOtherPlayerTurn) {
				endTurn()
				setTurnCountdownTimer(SECONDS_PER_TURN)
				return
			}
			const newTime = Math.ceil(
				(turnTimeLimit.getTime() - Date.now()) / 1000,
			)

			// If for whatever reason the newTime is negative we will set it to 0
			if (newTime < 0) {
				setTurnCountdownTimer(0)
				return
			}
			setTurnCountdownTimer(newTime)
		}, 1000)
		return () => {
			clearTimeout(countdownTimer)
		}
	}, [turnCountdownTimer])

	useEffect(() => {
		if (!state.game) return
		let visualEnemyHand
		let visualAllyHand
		if (state.playerNumber === 2) {
			visualEnemyHand =
				state.game.player1.hand.length > 0
					? state.game.player1.hand.map(() => (
							<div className="card" key={Math.random()}></div>
					  ))
					: [
							<div className="empty-hand" key={Math.random()}>
								Empty hand
							</div>,
					  ]
			visualAllyHand = generateHandCards(state.game.player2.hand, 2)
		} else {
			visualEnemyHand =
				state.game.player2.hand.length > 0
					? state.game.player2.hand.map(() => (
							<div className="card" key={Math.random()}></div>
					  ))
					: [
							<div className="empty-hand" key={Math.random()}>
								Empty hand
							</div>,
					  ]
			visualAllyHand = generateHandCards(state.game.player1.hand, 1)
		}
		dispatch({
			type: 'SET_HAND_CARDS',
			payload: {
				visualEnemyHand,
				visualAllyHand,
			},
		})
	}, [state.game, state.isAttackMode])

	// When the attack mode is activate, regenerate the field
	useEffect(() => {
		if (!state.game) return

		const { allyFieldHtml, enemyFieldHtml } = generateFieldCards(
			state.playerNumber,
			state.game.player1.field,
			state.game.player2.field,
			state.isOtherPlayerTurn,
		)
		dispatch({
			type: 'SET_FIELDS',
			payload: {
				allyFieldHtml,
				enemyFieldHtml,
			},
		})
	}, [state.game, state.isAttackMode])

	// Checked
	const generateFieldCards = (
		playerNumber,
		player1Field,
		player2Field,
		isOtherPlayerTurn,
	) => {
		console.log('generate field cards')
		let allySortedField = Array(FIELD_SIZE).fill(0)
		let enemySortedField = Array(FIELD_SIZE).fill(0)
		let allyFieldHtml = []
		let enemyFieldHtml = []

		// Sort the array so that cards are positioned in the middle
		if (player1Field.length > 0) {
			let mid = Math.floor(FIELD_SIZE / 2)
			let sidesSize = 1
			for (let i = 0; i < FIELD_SIZE; i++) {
				// Go mid, then right, if there's item right move left, if there's left move right + 1 and so on
				if (i == 0) {
					allySortedField[mid] = player1Field[i]
				} else if (player1Field[i]) {
					// If there's a card to the right move to the left
					if (allySortedField[mid + sidesSize]) {
						allySortedField[mid - sidesSize] = player1Field[i]
						sidesSize++
					} else {
						allySortedField[mid + sidesSize] = player1Field[i]
					}
				}
			}
		}

		if (player2Field.length > 0) {
			let mid = Math.floor(FIELD_SIZE / 2)
			let sidesSize = 1
			for (let i = 0; i < FIELD_SIZE; i++) {
				if (i == 0) {
					enemySortedField[mid] = player2Field[i]
				} else if (player2Field[i]) {
					// If there's a card to the right move to the left
					if (enemySortedField[mid + sidesSize]) {
						enemySortedField[mid - sidesSize] = player2Field[i]
						sidesSize++
					} else {
						enemySortedField[mid + sidesSize] = player2Field[i]
					}
				}
			}
		}

		// Swap fields if you're player 2
		if (playerNumber == 2) {
			const temp = allySortedField
			allySortedField = enemySortedField
			enemySortedField = temp
		}

		// Populate ally field with ally invoked cards or empty placeholders
		for (let i = 0; i < FIELD_SIZE; i++) {
			allyFieldHtml.push(
				<div className="field-item" key={i + Math.random()}>
					{allySortedField[i] ? (
						<BoardCard
							{...allySortedField[i]}
							dataId={allySortedField[i].id}
							key={allySortedField[i].id}
							turnEnded={isOtherPlayerTurn}
							playerNumberOwner={
								allySortedField[i].playerNumberOwner
							}
							toggleAttackMode={() => {
								toggleAttackMode(allySortedField[i].id)
							}}
						/>
					) : (
						''
					)}
				</div>,
			)
			enemyFieldHtml.push(
				<div
					className="field-item"
					key={i + Math.random()}
					onClick={(e) => {
						if (state.isAttackMode) attackField(e.currentTarget)
					}}
				>
					{enemySortedField[i] ? (
						<BoardCard
							{...enemySortedField[i]}
							dataId={enemySortedField[i].id}
							key={enemySortedField[i].id}
							turnEnded={isOtherPlayerTurn}
							playerNumberOwner={
								enemySortedField[i].playerNumberOwner
							}
							toggleAttackMode={() => {
								toggleAttackMode(enemySortedField[i].id)
							}}
						/>
					) : (
						''
					)}
				</div>,
			)
		}

		return { allyFieldHtml, enemyFieldHtml }
	}

	const generateHandCards = (handCards, playerNumberOwner) => {
		let cards =
			handCards.length > 0
				? handCards.map((card) => (
						<BoardCard
							{...card}
							key={card.id}
							dataId={card.id}
							playerNumberOwner={playerNumberOwner}
							toggleAttackMode={() => {
								toggleAttackMode(card.id)
							}}
							burnCardOnHand={() => {
								burnCardOnHand(card.id)
							}}
						/>
				  ))
				: [
						<div className="empty-hand" key={Math.random()}>
							Empty hand
						</div>,
				  ]
		return cards
	}

	const setListeners = () => {
		state.socket.on('set-state', (data) => {
			console.log('set-state data', data)

			if (data.game) {
				dispatch({
					type: 'SET_GAME',
					payload: {
						game: data.game,
					},
				})
			}

			if (data.isOtherPlayerTurn) {
				dispatch({
					type: 'SET_IS_OTHER_PLAYER_TURN',
					payload: {
						isOtherPlayerTurn: data.isOtherPlayerTurn,
					},
				})
			}
		})
		state.socket.on('new-turn', (game) => {
			if (state.playerNumber === game.currentPlayerTurn) {
				dispatch({
					type: 'SET_IS_OTHER_PLAYER_TURN',
					payload: {
						isOtherPlayerTurn: false,
					},
				})
				drawCard()
			} else {
				dispatch({
					type: 'SET_IS_OTHER_PLAYER_TURN',
					payload: {
						isOtherPlayerTurn: true,
					},
				})
			}

			dispatch({
				type: 'SET_GAME',
				payload: {
					game,
				},
			})

			// Restarts the countdown timer
			setTurnCountdownTimer(SECONDS_PER_TURN)
		})
		state.socket.on('draw-card-received', (game) => {
			dispatch({
				type: 'SET_GAME',
				payload: {
					game,
				},
			})
		}),
			state.socket.on('card-burned', (game) => {
				dispatch({
					type: 'SET_GAME',
					payload: {
						game,
					},
				})
			})
		state.socket.on('card-invoke-received', (game) => {
			dispatch({
				type: 'SET_GAME',
				payload: {
					game,
				},
			})
		})
		state.socket.on('attack-field-received', (game) => {
			dispatch({
				type: 'SET_GAME',
				payload: {
					game,
				},
			})
		})
		state.socket.on('attack-direct-received', (game) => {
			dispatch({
				type: 'SET_GAME',
				payload: {
					game,
				},
			})
		})
		state.socket.on('game-over', (data) => {
			dispatch({
				type: 'SET_GAME',
				payload: {
					game: data.game,
				},
			})
			// If the winner is this player, emit 'you win' message
			if (state.playerNumber === data.winner) {
				endGame(true)
			} else {
				// Emit 'you lose' message
				endGame(false)
			}
		})
	}

	const endTurn = () => {
		toggleAttackMode(0)

		dispatch({
			type: 'SET_IS_OTHER_PLAYER_TURN',
			payload: {
				isOtherPlayerTurn: true,
			},
		})
		state.socket.emit('end-turn', {
			currentGameID: state.game.gameId,
		})
	}

	const surrender = () => {
		toggleAttackMode(0)

		state.socket.emit('surrender', {
			currentGameID: state.game.gameId,
		})
	}

	const drawCard = () => {
		// We just check the socket id to determine which user is drawing
		state.socket.emit('draw-card', {
			game: state.game,
		})
	}

	/**
	 * @dev Burns the selected card on hand and refund a part of the cost as energy to the player
	 * @param {String} cardID
	 */
	const burnCardOnHand = (cardID) => {
		state.socket.emit('burn-card', {
			currentGameID: state.game.gameId,
			cardID,
			burnType: 'hand',
		})
	}
	const toggleAttackMode = (cardId) => {
		let isAttackMode = cardId == 0 ? false : !state.isAttackMode
		dispatch({
			type: 'SET_ATTACK_MODE',
			payload: {
				isAttackMode,
				attackingCardId: cardId,
			},
		})
	}
	/**
	 * @dev Handles the logic for attacking the enemy field card
	 */
	const attackField = (target) => {
		console.log('Attack Field executed')
		const currentGame = state.game
		console.log(target, target.firstChild.dataset.id, state.attackingCardId, 'target field attack')
		if (!currentGame) {
			return dispatch({
				type: 'SET_ERROR',
				payload: {
					error: 'Current game not found',
				},
			})
		}

		if (currentGame.status === 'ENDED') {
			return dispatch({
				type: 'SET_ERROR',
				payload: {
					error: 'Game is already over.',
				},
			})
		}
		// Disables the selected card from attacking again
		toggleAttackMode(0);
		state.socket.emit('attacked-field', {
			currentGameID: currentGame.gameId,
			attackingCardID: state.attackingCardId,
			enemyCardID: target.firstChild.dataset.id,
		})
	}

	/**
	 * @dev Handles the logic for directly attacking the enemy player
	 */
	const attackDirectly = () => {
		console.log('Attack directly executed')
		const currentGame = state.game

		if (!currentGame) {
			return dispatch({
				type: 'SET_ERROR',
				payload: {
					error: 'Current game not found',
				},
			})
		}

		if (currentGame.status === 'ENDED') {
			return dispatch({
				type: 'SET_ERROR',
				payload: {
					error: 'Game is already over.',
				},
			})
		}

		// Disables the selected card from attacking again
		toggleAttackMode(0)

		// Notify server of attack direct action by player
		state.socket.emit('attack-direct', {
			currentGameID: currentGame.gameId,
			attackingCardID: state.attackingCardId,
		})
	}

	const endGame = (amITheWinner) => {
		if (amITheWinner) {
			// Display the you win container
			setGameOver(
				<div className="game-over-container">
					<h1>You Win!</h1>
					<p>
						Congratulations you've earned 180 YTX tokens while 20
						YTX have been moved to the treasury!
					</p>
					<button>Redeem Earnings & Exit</button>
				</div>,
			)
		} else {
			// Display the you lost container
			setGameOver(
				<div className="game-over-container">
					<h1>You Lose!</h1>
					<p>Too bad, you lost the game. Good luck next time!</p>
					<Link to="/">Exit</Link>
				</div>,
			)
		}
	}

	return (
		<>
			{gameOver}
			<Board
				attackDirectly={() => attackDirectly()}
				endTurn={() => endTurn()}
				surrender={() => surrender()}
				turnCountdownTimer={turnCountdownTimer}
			/>
		</>
	)
}
