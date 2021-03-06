<?php

class Controller_api_credit_add extends Crunchbutton_Controller_RestAccount {

	public function init() {

		$this->_permission();

		switch ( $this->method() ) {
			case 'get':
				$this->_error();
			break;
			case 'post':
				$this->_post();
			break;
		}
	}

	private function _post(){
		$this->_save();
	}

	private function _save(){

		$id_user = $this->request()[ 'id_user' ];
		$value = $this->request()[ 'value' ];
		$note = $this->request()[ 'note' ];
		$add_as_credit = $this->request()[ 'add_as_credit' ];
		$send_notification = $this->request()[ 'send_notification' ];

		if( !$id_user ){
			$this->_error( 'It seems you have not selected an user!' );
		}

		if( !$value ){
			$this->_error( 'Please enter a value!' );
		}

		if( !$note ){
			$this->_error( 'Please enter a note!' );
		}

		if(c::user()->isCommunityDirector() && $value > 5){
			$this->_error( 'You can give a gift card up to $5!' );
		}

		$giftcard = new Crunchbutton_Promo;
		$giftcard->note = $note;
		$giftcard->value = $value;
		$giftcard->id_user = $id_user;
		$giftcard->type = Crunchbutton_Promo::TYPE_GIFTCARD;
		$giftcard->active = 1;
		$giftcard->id_admin = c::user()->id_admin;
		$giftcard->paid_by = 'crunchbutton';
		$giftcard->date = date('Y-m-d H:i:s');
		$giftcard->code = $giftcard->promoCodeGeneratorUseChars( Crunchbutton_Promo::CHARS, 10, '', '.la.' );
		$giftcard->issued = Crunchbutton_Promo::ISSUED_CREDIT;
		$giftcard->save();

		$user = User::o( $id_user );

		if( $add_as_credit ){
			$credit = $giftcard->addCredit( $id_user, 0, $note );
			$message = '$' . $credit->value . ' credit added to ' . $credit->user()->name . '!';
			$_message = 'Credit $' . $value . ' added to customer ' . $user->name . '!';
		} else {
			$_message = 'Gift card $' . $value . ' created to customer ' . $user->name . '!';
		}

		$_message .= ' Promo #' . $giftcard->id_promo .'. ';

		if( $note ){
			$_message .= "\nNote: " . $note;
		}

		if( $send_notification ){

			$_message .= "\nNotification sent by sms.";

			if( $add_as_credit ){
				$credit->notifySMS();
			} else {
				if( $user->phone ){
					$giftcard->phone = $user->phone;
					$giftcard->code = $giftcard->promoCodeGeneratorUseChars( Crunchbutton_Promo::NUMBERS, 7, $giftcard->id_promo, '' );
					$giftcard->save();
					$giftcard->notifySMS();
					$message = 'Gift card created and sent to customer by text message!';
				} else {
					$this->_error( 'Error, this customer does not have a phone number.' );
				}
			}
		}

		$lastOrder = $user->lastOrder();

		Crunchbutton_Support::createNewWarning(  [ 'dont_open_ticket' => true, 'body' => $_message, 'phone' => $user->phone, 'id_order' => $lastOrder->id_order ] );

		echo json_encode( [ 'success' => $message ] );
		exit();
	}

	private function _error( $error = 'invalid request' ){
		echo json_encode( [ 'error' => $error ] );
		exit();
	}

	private function _permission(){
		if (!c::admin()->permission()->check(['global', 'gift-card-all', 'gift-card-create-all', 'support-all', 'support-view', 'support-crud' ]) && !c::user()->isCommunityDirector()) {
			header('HTTP/1.1 401 Unauthorized');
			exit;
		}
	}


}