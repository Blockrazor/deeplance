import { Meteor } from 'meteor/meteor'
import { ValidatedMethod } from 'meteor/mdg:validated-method'
import SimpleSchema from 'simpl-schema'

const isModerator = userId => {
    let user = Meteor.users.findOne({
        _id: userId
    })

    return user && user.moderator
}

const approvedUser = userId => {
    let user = Meteor.users.findOne({
       _id: userId
    })

    return !user || (user && user.profile && user.profile.hourlyRateApproved)
}

export const saveSettings = new ValidatedMethod({
    name: 'saveSettings',
    validate:
        new SimpleSchema({
            name: {
            	type: String,
            	optional: false
            },
            paymentMethod: {
                type: String,
                optional: false
            },
            hourlyRate: {
                type: Number,
                optional: false
            },
            walletAddress: {
                type: String,
                optional: true
            },
            bankDetails: {
                type: String,
                optional: true
            },
            banktransferDetails: {
                type: String,
                optional: true
            },
            paypalEmail: {
                type: String,
                optional: true
            },
            minpayout: {
                type: String,
                optional: false
            },
            maxpayout: {
                type: String,
                optional: false
            }
        }).validator({
        	 clean: true
        }),
    run({ name, paymentMethod, hourlyRate, walletAddress, bankDetails,banktransferDetails, paypalEmail, minpayout,maxpayout }) {
        if (!Meteor.userId()) {
    	     throw new Meteor.Error('Error.', 'You have to be logged in.')
    	}

        let user = Meteor.users.findOne({
            _id: Meteor.userId()
        })

    	return Meteor.users.update({
            _id: Meteor.userId()
        }, {
            $set: {
                'profile.name': name,
                'profile.paymentMethod': paymentMethod,
                'profile.hourlyRate': hourlyRate,
                'profile.hourlyRateApproved': hourlyRate === ((user || {}).profile || {}).hourlyRate,
                'profile.walletAddress': walletAddress || '',
                'profile.bankDetails': bankDetails || '',
                'profile.paypalEmail': paypalEmail || '',
                'profile.banktransferDetails': banktransferDetails || '',
                'profile.minpayout': minpayout || '',
                'profile.maxpayout': maxpayout || ''
            }
        })
    }
})

export const approveHourlyRate = new ValidatedMethod({
    name: 'approveHourlyRate',
    validate:
        new SimpleSchema({
            userId: {
                type: String,
                optional: false
            }
        }).validator({
             clean: true
        }),
    run({ userId }) {
        if (!Meteor.userId()) {
             throw new Meteor.Error('Error.', 'You have to be logged in.')
        }

        if (isModerator(Meteor.userId())) {
            return Meteor.users.update({
                _id: userId
            }, {
                $set: {
                    'profile.hourlyRateApproved': true
                }
            })
        }
    }
})

export const hideConfirmationModal = new ValidatedMethod({
    name: 'hideConfirmationModal',
    validate: new SimpleSchema({
        modalId: {
            type: String,
            optional: false
        }
    }).validator({
        clean: true
    }),
    run({ modalId }) {
        if (!Meteor.userId()) {
            throw new Meteor.Error('Error.', 'You have to be logged in.')
        }

        return Meteor.users.update({
            _id: Meteor.userId()
        }, {
            $addToSet: {
                hidden: modalId
            }
        })
    }
})

export const resetHiddenModals = new ValidatedMethod({
    name: 'resetHiddenModals',
    validate: new SimpleSchema({}).validator({
        clean: true
    }),
    run({ }) {
        if (!Meteor.userId()) {
            throw new Meteor.Error('Error.', 'You have to be logged in.')
        }

        return Meteor.users.update({
            _id: Meteor.userId()
        }, {
            $set: {
                hidden: []
            }
        })
    }
})

export { isModerator, approvedUser }

if (Meteor.isDevelopment) {
    Meteor.methods({
        generateTestUser: () => {
            let user = Meteor.users.findOne({
                username: 'testing'
            })

            if (!user) {
                let uId = Accounts.createUser({
                    username: 'testing',
                    password: 'testing',
                    email: 'testing@testing.test',
                    profile: {
                        name: 'Tester',
                        paymentMethod: 'swift',
                        hourlyRate: 100000,
                        hourlyRateApproved: true,
                        minpayout: '200',
                        maxpayout: '2000'
                    }
                })

                Meteor.users.update({
                    _id: uId
                }, {
                    $set: {
                        moderator: true
                    }
                })
            }
        },
        generateTestMod: () => {
            let user = Meteor.users.findOne({
                username: 'testingmod'
            })

            if (!user) {
                let uId = Accounts.createUser({
                    username: 'testingmod',
                    password: 'testingmod',
                    email: 'testingmod@testing.test',
                    profile: {
                        name: 'TesterMod',
                        paymentMethod: 'swift',
                        hourlyRate: 100000,
                        hourlyRateApproved: true,
                        minpayout: '200',
                        maxpayout: '2000'
                    }
                })

                Meteor.users.update({
                    _id: uId
                }, {
                    $set: {
                        moderator: true
                    }
                })
            }
        },
        toggleModStatus: (toggle) => {
            Meteor.users.update({
                _id: Meteor.userId()
            }, {
                $set: {
                    moderator: toggle
                }
            })
        }
    })
}
